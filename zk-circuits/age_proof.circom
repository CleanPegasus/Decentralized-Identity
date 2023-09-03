pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";


template AgeProof() {
    signal input doBTimestamp; // Timestamp of the DoB in seconds
    signal input address; // Address of the user
    signal input currentTimestamp; // Current time in seconds
    signal input ageThreshold; // Age threshold in seconds
    signal input hash; // Hash of the address and the DoB timestamp

    signal age;
    age <== currentTimestamp - doBTimestamp;

    component lte = LessThan(252);
    lte.in[0] <== age;
    lte.in[1] <== ageThreshold;
    lte.out === 0;

    log("lt", lte.out);

    component poseidon = Poseidon(2);
    poseidon.inputs[0] <== address;
    poseidon.inputs[1] <== doBTimestamp;
    hash === poseidon.out;

}

component main {public [address, currentTimestamp, ageThreshold, hash]} = AgeProof();
