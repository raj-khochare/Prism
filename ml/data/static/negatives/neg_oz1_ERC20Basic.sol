// source: openzeppelin-solidity@1.12.0 / ERC20Basic.sol (flattened by collect_static.py)
pragma solidity ^0.4.24;
// ---- ERC20Basic.sol ----
/**
 * @title ERC20Basic
 * @dev Simpler version of ERC20 interface
 * See https://github.com/ethereum/EIPs/issues/179
 */
contract ERC20Basic {
  function totalSupply() public view returns (uint256);
  function balanceOf(address _who) public view returns (uint256);
  function transfer(address _to, uint256 _value) public returns (bool);
  event Transfer(address indexed from, address indexed to, uint256 value);
}
