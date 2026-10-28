// source: openzeppelin-solidity@1.12.0 / Math.sol (flattened by collect_static.py)
pragma solidity ^0.4.24;
// ---- Math.sol ----
/**
 * @title Math
 * @dev Assorted math operations
 */
library Math {
  function max64(uint64 _a, uint64 _b) internal pure returns (uint64) {
    return _a >= _b ? _a : _b;
  }

  function min64(uint64 _a, uint64 _b) internal pure returns (uint64) {
    return _a < _b ? _a : _b;
  }

  function max256(uint256 _a, uint256 _b) internal pure returns (uint256) {
    return _a >= _b ? _a : _b;
  }

  function min256(uint256 _a, uint256 _b) internal pure returns (uint256) {
    return _a < _b ? _a : _b;
  }
}
