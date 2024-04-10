// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CustomToken is ERC20 {
    uint256 private _maxSupply;

    constructor(uint256 maxSupply_) ERC20("CustomToken", "CTK") {
        _maxSupply = maxSupply_;
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

    function maxSupply() public view virtual returns (uint256) {
        return _maxSupply;
    }

    function mint(address to, uint256 amount) public validSupply(amount) {
        _mint(to, amount);
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
}
