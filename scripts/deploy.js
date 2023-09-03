const hre = require("hardhat");
const ethers = require("ethers");
const circomlibjs = require("circomlibjs");
const snarkjs = require("snarkjs");

const fs = require("fs");

async function poseidonHash(inputs) {
  const poseidon = await circomlibjs.buildPoseidon();
  const poseidonHash = poseidon.F.toString(poseidon(inputs));
  return poseidonHash;
}

async function deploy() {

  const dIdentityContract = await hre.ethers.deployContract("DIdentity");
  await dIdentityContract.waitForDeployment();
  console.log("DIdentity deployed to:", dIdentityContract.target);

  return dIdentityContract;
}

async function mintIdentity(signer, name, DoB, dIdentityContract) {
  const UID = ethers.sha256(ethers.toUtf8Bytes(signer.address + name + DoB));
  const nameHash = ethers.sha256(ethers.toUtf8Bytes(signer.address + name));
  const DoBHash = await poseidonHash([signer.address, DoB]);

  const identity = {
    UID: UID,
    nameHash: nameHash,
    dobHash: DoBHash,
  }

  console.log(identity);

  const tx = await dIdentityContract.mint(signer.address, identity);
  await tx.wait();
}

async function createProfile(signer, address, creditScore, dIdentityContract) {
  const hash = await poseidonHash([address, creditScore]);
  const profile = {
    entity: "Bank Credit Score",
    dataHash: hash,
    timestamp: Date.now(),
  }
  const tx = await dIdentityContract.connect(signer).setProfile(address, profile);
  await tx.wait();
}

async function createAgeProof(signer, doBTimestamp, currentTimestamp, ageThreshold) {
  const hash = await poseidonHash([signer.address, doBTimestamp]);
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    { doBTimestamp: doBTimestamp, address: signer.address, currentTimestamp: currentTimestamp, ageThreshold: ageThreshold, hash: hash }, 
    "build/age_proof_js/age_proof.wasm", 
    "circuit_0.zkey");

  return { proof, publicSignals };
}

async function verifyAgeProof(address, proof, publicSignals, dIdentityContract) {
  const id = await dIdentityContract.getID(address);
  const vKey = JSON.parse(fs.readFileSync("verification_key.json"));
  const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);
  return (res && (id.dobHash == publicSignals[3]));
}

async function createCreditProof(signer, creditScore, minCreditScore, maxCreditScore) {
  const hash = await poseidonHash([signer.address, creditScore]);
  const {proof, publicSignals} = await snarkjs.groth16.fullProve(
    { creditScore: creditScore, minCreditScore: minCreditScore, maxCreditScore: maxCreditScore, address: signer.address, hash: hash },
    "build/credit_proof_js/credit_proof.wasm",
    "circuit_1.zkey");

  const creditProof = proof;
  const creditPublicSignals = publicSignals;
  return { creditProof, creditPublicSignals };
}

async function verifyCreditProof(profiler, address, proof, publicSignals, dIdentityContract) {
  const profile = await dIdentityContract.getProfile(profiler, address);
  const dataHash = profile.dataHash;
  const vKey = JSON.parse(fs.readFileSync("verification_key_1.json"));
  const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);
  return (res && (dataHash == publicSignals[3]));
}

async function main() {
  const dIdentityContract = await deploy();

  const [deployer, addr1, addr2] = await hre.ethers.getSigners();

  const name = "John Doe";
  const DoB = "01/01/2000";
  const DoBTimestamp = Date.parse(DoB)
  console.log(DoBTimestamp)
  await mintIdentity(addr1, name, DoBTimestamp, dIdentityContract);
  const identity = await dIdentityContract.getID(addr1.address);
  console.log(identity);
  const ageThreshold = 21 * 365 * 24 * 60 * 60; // 21 years in seconds
  const {proof, publicSignals} = await createAgeProof(addr1, DoBTimestamp, Date.now(), ageThreshold);
  console.log(publicSignals);
  const verification = await verifyAgeProof(addr1.address, proof, publicSignals, dIdentityContract);
  console.log(verification);

  // Create Profile
  await createProfile(deployer, addr1.address, 700, dIdentityContract);

  // Credit Proof
  const {creditProof, creditPublicSignals } = await createCreditProof(addr1, 700, 600, 800);
  const creditVerification = await verifyCreditProof(deployer.address, addr1.address, creditProof, creditPublicSignals, dIdentityContract);
  console.log(creditVerification);

}




main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

