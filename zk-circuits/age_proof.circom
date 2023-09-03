pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/sha256/sha256.circom";

include "../node_modules/circomlib/circuits/poseidon.circom";

template AgeProof() {
    signal input doBTimestamp; // Timestamp of the DoB in seconds
    signal input address; // Address of the user
    signal input currentTimestamp; // Current time in seconds
    signal input ageThreshold; // Age threshold in seconds
    signal input hash; // Poseidon Hash of (address, doBTimestamp)
    signal output isValid; // checks if the user is older than the age threshold

    // Calculate Poseidon hash
    component poseidon = Poseidon(2);
    poseidon.inputs[0] <== address;
    poseidon.inputs[1] <== doBTimestamp;
    hash === poseidon.out;

    // Intermediate signals
    signal isInvalid;
    signal validAge;

    // Initialize isInvalid
    isInvalid <== 0;

    // Calculate validAge
    log("currentTimestamp", currentTimestamp);
    log("doBTimestamp", doBTimestamp);
    log("ageThreshold", ageThreshold);


    validAge <== currentTimestamp - doBTimestamp - ageThreshold;
    log("validAge", validAge);

    // Set up quadratic constraint for age validation
    isInvalid * validAge === 0;
    log("isInvalid", isInvalid);
    // Ensure isInvalid is a boolean signal

    isInvalid * (1 - isInvalid) === 0;
    // Calculate isValid

    isValid <== 1 - isInvalid;
    log("isValid", isValid);

}

component main {public [address, currentTimestamp, ageThreshold, hash]} = AgeProof();
