// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract CustomToken is ERC20 {
    using EnumerableSet for EnumerableSet.AddressSet;
    EnumerableSet.AddressSet private mintingAdmins;

    uint256 private _maxSupply;
    uint256 public TMAX;
    uint256 private lastResetTimestamp;
    mapping(address => uint256) public dailyMintedAmounts; // Track daily mints per admin

    mapping(uint256 => mapping(address => bool)) public tmaxVotes;

    constructor(
        uint256 maxSupply_,
        address[] memory mintingAdmins_,
        uint256 tmax_ // Add the TMAX parameter
    ) ERC20("CustomToken", "CTK") {
        _maxSupply = maxSupply_;
        TMAX = tmax_;
        for (uint256 i = 0; i < mintingAdmins_.length; i++) {
            mintingAdmins.add(mintingAdmins_[i]);
        }
    }

    modifier validRecipient(address _recipient) {
        require(
            _recipient != address(0),
            "Cannot transfer to the zero address"
        );
        _;
    }

    modifier validSupply(uint256 _amount) {
        require(
            totalSupply() + _amount <= maxSupply(),
            "Cannot mint more than max supply"
        );
        _;
    }

    modifier onlyMinter() {
        require(mintingAdmins.contains(msg.sender), "Caller is not a minter");
        _;
    }

    function maxSupply() public view virtual returns (uint256) {
        return _maxSupply;
    }

    function mint(
        address to,
        uint256 amount
    ) public validSupply(amount) onlyMinter {
        resetDailyMintedAmounts();
        require(
            dailyMintedAmounts[msg.sender] + amount <= TMAX,
            "Individual daily limit exceeded"
        );
        dailyMintedAmounts[msg.sender] += amount;
        _mint(to, amount);
    }

    function mintBatch(
        address[] memory recipients,
        uint256[] memory amounts
    ) public onlyMinter {
        require(
            recipients.length == amounts.length,
            "Recipients and amounts arrays must have the same length"
        );

        for (uint i = 0; i < recipients.length; i++) {
            mint(recipients[i], amounts[i]);
        }
    }

    function proposeTMAX(uint256 _tmax) public onlyMinter {
        tmaxVotes[_tmax][msg.sender] = true;
        uint256 votes = getVoteCount(tmaxVotes[_tmax]);
        if (votes * 2 > mintingAdmins.length()) {
            TMAX = _tmax;
            for (uint256 i = 0; i < mintingAdmins.length(); i++) {
                address adminAddress = mintingAdmins.at(i);
                delete tmaxVotes[_tmax][adminAddress];
            }
        }
    }

    function transfer(
        address recipient,
        uint256 amount
    ) public override validRecipient(recipient) returns (bool) {
        return super.transfer(recipient, amount);
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override validRecipient(recipient) returns (bool) {
        return super.transferFrom(sender, recipient, amount);
    }

    function resetDailyMintedAmounts() internal {
        uint256 currentDay = block.timestamp / (24 * 60 * 60); // Approx. day based on timestamp
        if (currentDay > lastResetTimestamp) {
            lastResetTimestamp = currentDay;
            for (uint256 i = 0; i < mintingAdmins.length(); i++) {
                address adminAddress = mintingAdmins.at(i);
                dailyMintedAmounts[adminAddress] = 0;
            }
        }
    }

    function getVoteCount(
        mapping(address => bool) storage votes
    ) internal view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < EnumerableSet.length(mintingAdmins); i++) {
            if (votes[EnumerableSet.at(mintingAdmins, i)]) {
                count++;
            }
        }
        return count;
    }
}
