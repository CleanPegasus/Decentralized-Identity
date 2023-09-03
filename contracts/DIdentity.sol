// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "hardhat/console.sol";

contract DIdentity is Ownable {

    struct Identity {
        bytes32 UID;
        bytes32 nameHash; // keccak256 hash of name
        uint256 dobHash; // Poseidon hash of date of birth
        // bytes32 verificationHash; // keccak256 hash of verification data
    }

    struct Profile {
        string entity;
        uint256 dataHash;
        uint256 timestamp;
    }

    mapping (address => Identity) private identities;
    mapping (address => mapping (address => Profile)) identityProfiles;
    mapping (address => address[]) private profiles;

    string public name;
    bytes32 private zeroHash = bytes32(0);
    
    event Mint(address _soul);
    event Burn(address _soul);
    event Update(address _soul);
    event SetProfile(address _profiler, address _soul);
    event RemoveProfile(address _profiler, address _soul);


    function mint(address _soul, Identity memory _identityData) external onlyOwner {
        require(identities[_soul].UID == zeroHash, "Soul already exists");
        identities[_soul] = _identityData;
        emit Mint(_soul);
    }

    function burn(address _soul) external onlyOwner {
        delete identities[_soul];
        for (uint i=0; i<profiles[_soul].length; i++) {
            address profiler = profiles[_soul][i];
            delete identityProfiles[profiler][_soul];
        }
        emit Burn(_soul);
    }

    function update(address _soul, Identity memory _identityData) external {
        require(identities[_soul].UID != zeroHash, "Soul does not exist");
        identities[_soul] = _identityData;
        emit Update(_soul);
    }

    function hasSoul(address _soul) external view returns (bool) {
        if (identities[_soul].UID == zeroHash) {
            return false;
        } else {
            return true;
        }
    }

    function getSoul(address _soul) external view returns (Identity memory) {
        return identities[_soul];
    }

    // Profile functions
    function setProfile(address _soul, Profile memory _profileData) external {
        require(identities[_soul].UID != zeroHash, "Cannot create a profile for a soul that has not been minted");
        identityProfiles[msg.sender][_soul] = _profileData;
        profiles[_soul].push(msg.sender);
        emit SetProfile(msg.sender, _soul);
    }

    function getProfile(address _profiler, address _soul) external view returns (Profile memory) {
        return identityProfiles[_profiler][_soul];
    }

    function listProfiles(address _soul) external view returns (address[] memory) {
        return profiles[_soul];
    }

    function hasProfile(address _profiler, address _soul) public view returns (bool) {
        if (keccak256(bytes(identityProfiles[_profiler][_soul].entity)) == zeroHash) {
            return false;
        } else {
            return true;
        }
    }

    function removeProfile(address _profiler, address _soul) external {
        require(msg.sender == _soul, "Only users have rights to delete their profile data");
        require(hasProfile(_profiler, _soul), "Profile does not exist");
        delete identityProfiles[_profiler][msg.sender];
        emit RemoveProfile(_profiler, _soul);
    }

    // Getters
    function getID(address _soul) external view returns (Identity memory) {
        return identities[_soul];
    }
}