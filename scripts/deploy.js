const hre = require("hardhat");
const ethers = require("ethers");
const circomlibjs = require("circomlibjs");
const snarkjs = require("snarkjs");

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

async function mintIdentity(signer, name, DoB, pin, dIdentityContract) {
  const UID = ethers.sha256(ethers.toUtf8Bytes(address + name + DoB));
  const nameHash = ethers.sha256(ethers.toUtf8Bytes(signer.address + name));
  const DoBHash = await poseidonHash([signer.address, DoB]);
  const verificationHash = ethers.sha256(ethers.toUtf8Bytes(UID + pin));

  const identity = {
    UID: UID,
    nameHash: nameHash,
    dobHash: DoBHash,
    verificationHash: verificationHash,
  }

  console.log(identity);

  const tx = await dIdentityContract.mint(signer.address, identity);
  await tx.wait();
}

async function createZKP(signer) {
  const hash = await poseidonHash([signer.address, 1000]);
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    { doBTimestamp: 1000, address: signer.address, currentTimestamp: 1003, ageThreshold: 4, hash: hash }, 
    "build/age_proof_js/age_proof.wasm", 
    "circuit_0.zkey");
  console.log(publicSignals);
  console.log(proof);
}

async function main() {
  // const dIdentityContract = await deploy();

  const [owner, addr1, addr2] = await hre.ethers.getSigners();

  // const name = "John Doe";
  // const DoB = "01/01/2000";
  // const DoBTimestamp = Date.parse(DoB)
  // console.log(DoBTimestamp)
  // const pin = '69420'
  // await mintIdentity(addr1, name, DoBTimestamp, pin, dIdentityContract);
  // const identity = await dIdentityContract.getID(addr1.address);
  // console.log(identity);
  await createZKP(addr1);

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

