// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CustomToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("CustomToken", "CTK") {
        _mint(msg.sender, initialSupply);
    }
}
