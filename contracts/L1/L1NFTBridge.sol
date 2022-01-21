// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { Address } from "@openzeppelin/contracts/utils/Address.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

contract L1NFTBridge is AccessControl {
    
    bytes32 public constant INIT_CROSS_DOMAIN_NFT_ROLE = keccak256("INIT_CROSS_DOMAIN_NFT_ROLE");

    address public nftDeposit;
    uint256 public toChainId;

    enum NFTType {
        ERC721,
        ERC1155
    }

    mapping(address => address) public cloneL2L1;
    mapping(address => address) public cloneL1L2;

    //L1 token =>  ( tokenId =>  l2Receiver )
    mapping(address => mapping(uint256 => address)) public crossDomains;

    modifier onlyEOA() {
        require(!Address.isContract(msg.sender), "Account not EOA");
        _;
    }

    constructor(address owner, address project, address l1Deposit, uint256 l2ChainId) {
        _setupRole(DEFAULT_ADMIN_ROLE, owner);
        _setupRole(INIT_CROSS_DOMAIN_NFT_ROLE, project);
        nftDeposit = l1Deposit;
        toChainId = l2ChainId;
    }

    function deposit(address nft, address from, address l2Receiver, uint256 id,  NFTType nftStandard) external onlyEOA() {
       if(NFTType.ERC721 == nftStandard) {
            IERC721(nft).safeTransferFrom(from, nftDeposit, id);
       }
       if(NFTType.ERC1155 == nftStandard) {
            uint256 amount = IERC1155(nft).balanceOf(from, id);
            IERC1155(nft).safeTransferFrom(from, nftDeposit, id, amount, "");
       }
        crossDomains[nft][id] = l2Receiver;
    }

    function initCrossDomainNFT(address L2NFT, address L1NFT) external onlyRole(INIT_CROSS_DOMAIN_NFT_ROLE) {
        cloneL2L1[L2NFT] = L1NFT;
        cloneL1L2[L1NFT] = L2NFT;
    }
}