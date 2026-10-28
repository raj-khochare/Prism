// source: openzeppelin-solidity@1.12.0 / TokenMetadata.sol (flattened by collect_static.py)
pragma solidity ^0.4.21;
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

// ---- ERC20.sol ----
/**
 * @title ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
contract ERC20 is ERC20Basic {
  function allowance(address _owner, address _spender)
    public view returns (uint256);

  function transferFrom(address _from, address _to, uint256 _value)
    public returns (bool);

  function approve(address _spender, uint256 _value) public returns (bool);
  event Approval(
    address indexed owner,
    address indexed spender,
    uint256 value
  );
}

// ---- TokenMetadata.sol ----
/**
 * @title ERC-1047 Token Metadata
 * @dev See https://eips.ethereum.org/EIPS/eip-1046
 * @dev tokenURI must respond with a URI that implements https://eips.ethereum.org/EIPS/eip-1047
 * @dev TODO - update https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/contracts/token/ERC721/ERC721.sol#L17 when 1046 is finalized
 */
contract ERC20TokenMetadata is ERC20 {
  function tokenURI() external view returns (string);
}


contract ERC20WithMetadata is ERC20TokenMetadata {
  string private tokenURI_ = "";

  constructor(string _tokenURI)
    public
  {
    tokenURI_ = _tokenURI;
  }

  function tokenURI() external view returns (string) {
    return tokenURI_;
  }
}
