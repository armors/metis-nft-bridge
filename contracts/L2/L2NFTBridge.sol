// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { Address } from "@openzeppelin/contracts/utils/Address.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";

import { CrossDomainEnabled } from "../gateway/CrossDomainEnabled.sol";

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import { INFTBridge } from "../INFTBridge.sol";
import { INFTDeposit } from "../INFTDeposit.sol";

import { IStandarERC721 } from "../IStandarERC721.sol";
import { IStandarERC1155 } from "../IStandarERC1155.sol";

contract L2NFTBridge is AccessControl, CrossDomainEnabled {
    
    // l2 bridge
    address public destNFTBridge;
    
    // l1 nft deposit
    address public localNFTDeposit;

    // l1 chainid
    uint256 constant public DEST_CHAINID = 31337;

    function getChainID() internal view returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }
    
    enum nftenum {
        ERC721,
        ERC1155
    }
    
    // L2 nft => L1 nft
    mapping(address => address) public clone;
    
    // L2 nft => is the original
    mapping(address => bool) public isOrigin;
    
    // L2 nft => L2 nft id => is the deposited
    mapping(address => mapping( uint256 => bool )) public isDeposit;
    
    modifier onlyEOA() {
        require(!Address.isContract(msg.sender), "Account not EOA");
        _;
    }

    constructor(address _owner, address _localMessenger) CrossDomainEnabled(_localMessenger) {
        _setupRole(DEFAULT_ADMIN_ROLE, _owner);
    }

    function set(address _localNFTDeposit, address _destNFTBridge) public onlyRole(DEFAULT_ADMIN_ROLE){
        localNFTDeposit = _localNFTDeposit;
        destNFTBridge = _destNFTBridge;
    }
    
    function configNFT(address destNFT, address localNFT, uint256 originNFTChainId) external virtual onlyFromCrossDomainAccount(destNFTBridge) {
        clone[localNFT] = destNFT;
        uint256 localChainId = getChainID();
        
        isOrigin[localNFT] = false;
        if(localChainId == originNFTChainId){
            isOrigin[localNFT] = true;
        }
    }
    
    function depositTo(address localNFT, address destTo, uint256 id,  nftenum nftStandard, uint32 destGas) external onlyEOA() {
       
       uint256 amount = 0;
       
       if(nftenum.ERC721 == nftStandard) {
            IERC721(localNFT).safeTransferFrom(msg.sender, localNFTDeposit, id);
       }
       
       if(nftenum.ERC1155 == nftStandard) {
            amount = IERC1155(localNFT).balanceOf(msg.sender, id);
            IERC1155(localNFT).safeTransferFrom(msg.sender, localNFTDeposit, id, amount, "");
       }
       
       isDeposit[localNFT][id] = true;
    
       address destNFT = clone[localNFT];

       _DepositByChainId(DEST_CHAINID, destNFT, msg.sender, destTo, id, amount, uint8(nftStandard), destGas);
    }

    function _DepositByChainId(uint256 chainId, address destNFT, address from, address destTo, uint256 id, uint256 amount, uint8 nftStandard, uint32 destGas) internal {

        bytes memory message =  abi.encodeWithSelector(
            INFTBridge.finalizeDeposit.selector,
            destNFT,
            from,
            destTo,
            id,
            amount,
            nftStandard
        );
        
        sendCrossDomainMessageViaChainId(
            chainId,
            destNFTBridge,
            destGas,
            message,
            msg.value
        );
    }

    function finalizeDeposit(address _localNFT, address _destfrom, address _localTo, uint256 id, uint256 _amount, nftenum nftStandard) external virtual onlyFromCrossDomainAccount(destNFTBridge) {
        
        if(nftenum.ERC721 == nftStandard) {
            if(isDeposit[_localNFT][id]){
                INFTDeposit(localNFTDeposit).withdrawERC721(_localNFT, _localTo, id);
            }else{
                IStandarERC721(_localNFT).mint(_localTo, id);
            }
        }

        if(nftenum.ERC1155 == nftStandard) {
            if(isDeposit[_localNFT][id]){
                INFTDeposit(localNFTDeposit).withdrawERC1155(_localNFT, _localTo, id, _amount);
            }else{
                IStandarERC1155(_localNFT).mint(_localTo, id, _amount, "");
            }
        }
    }

}
