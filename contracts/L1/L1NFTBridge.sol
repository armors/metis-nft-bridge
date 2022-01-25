// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { Address } from "@openzeppelin/contracts/utils/Address.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

import { CrossDomainEnabled } from "../gateway/CrossDomainEnabled.sol";
import { iMVM_DiscountOracle } from "../gateway/iMVM_DiscountOracle.sol";
import { Lib_AddressManager } from "../gateway/Lib_AddressManager.sol";

import { IL2NFTBridge } from "../L2/IL2NFTBridge.sol";

contract L1NFTBridge is AccessControl, CrossDomainEnabled {
    
    bytes32 public constant NFT_FACTORY_ROLE = keccak256("NFT_FACTORY_ROLE");

    address public l2NFTBridge;
    address public l1NFTDeposit;
    
    address public addressManager;

    uint256 constant public DEST_CHAINID = 1088;
    
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
    // L1 nft => L2 nft
    mapping(address => address) public clone;
    // L1 nft => is the original
    mapping(address => bool) public isOriginNFT;

    modifier onlyEOA() {
        require(!Address.isContract(msg.sender), "Account not EOA");
        _;
    }

    constructor(address _owner, address _nftFactory, address _addressManager, address _l1Messenger) CrossDomainEnabled(_l1Messenger) {
        _setupRole(DEFAULT_ADMIN_ROLE, _owner);
        _setupRole(NFT_FACTORY_ROLE, _nftFactory);
        addressManager = _addressManager;
    }

    function set(address _l1NFTDeposit, address _l2NFTBridge) public onlyRole(DEFAULT_ADMIN_ROLE){
        l1NFTDeposit = _l1NFTDeposit;
        l2NFTBridge = _l2NFTBridge;
    }
    
    function configNFT(address L1NFT, address L2NFT, uint256 originNFTChainId) external onlyRole(NFT_FACTORY_ROLE) {
        clone[L1NFT] = L2NFT;
        uint256 localChainId = getChainID();
        
        isOriginNFT[L1NFT] = false;
        if(localChainId == originNFTChainId){
            isOriginNFT[L1NFT] = true;
        }
        bytes memory message =  abi.encodeWithSelector(
            IL2NFTBridge.configNFT.selector,
            L1NFT,
            L2NFT,
            originNFTChainId,
        );
        
        // Send calldata into L2
        sendCrossDomainMessageViaChainId(
            DEST_CHAINID,
            l2NFTBridge,
            0,
            message,
            msg.value  //send all values as fees to cover l2 tx cost
        );
    }

    // function depositTo(address L1NFT, address to, uint256 id,  nftenum nftStandard, uint32 l2Gas, bytes calldata data) external onlyEOA() {
    //     uint256 amount = 0;

    //    if(nftenum.ERC721 == nftStandard) {
    //         IERC721(L1NFT).safeTransferFrom(msg.sender, l1NFTDeposit, id);
    //    }
    //    if(nftenum.ERC1155 == nftStandard) {
    //         amount = IERC1155(L1NFT).balanceOf(msg.sender, id);
    //         IERC1155(L1NFT).safeTransferFrom(msg.sender, l1NFTDeposit, id, amount, "");
    //    }
        
    //     address L2NFT = cloneL1L2[L1NFT];
    //     if(L2NFT == address(0)){
    //         L2NFT = cloneL2L1[L1NFT];
    //     }

    //     _DepositByChainId(DEFAULT_CHAINID, L1NFT, L2NFT, msg.sender, to, amount, uint8(nftStandard), l2Gas, data)
    // }

    // function _DepositByChainId(uint256 chainId, address L1NFT, address L2NFT, address from, address to, uint256 amount, uint8 nftStandard, uint32 l2Gas, bytes calldata data) internal {
    
    //     iMVM_DiscountOracle oracle = iMVM_DiscountOracle(Lib_AddressManager(addressManager).getAddress('MVM_DiscountOracle'));    
    //     // stack too deep. so no more local variables
    //     if (l2Gas < uint32(oracle.getMinL2Gas())) {
    //         l2Gas = uint32(oracle.getMinL2Gas());
    //     }
        
    //     require(l2Gas * oracle.getDiscount() <= msg.value, string(abi.encodePacked("insufficient fee supplied. send at least ", uint2str(l2Gas * oracle.getDiscount()))));
        
    //     // Construct calldata for finalizeDeposit call
    //     bytes memory message =  abi.encodeWithSelector(
    //         IL2NFTBridge.finalizeDeposit.selector,
    //         L1NFT,
    //         L2NFT,
    //         from,
    //         to,
    //         amount,
    //         nftStandard,
    //         data
    //     );
        
    //     // Send calldata into L2
    //     sendCrossDomainMessageViaChainId(
    //         chainId,
    //         l2NFTBridge,
    //         l2Gas,
    //         message,
    //         msg.value  //send all values as fees to cover l2 tx cost
    //     );
    // }

    // function uint2str(uint _i) internal pure returns (string memory _uintAsString) {
    //     if (_i == 0) {
    //         return "0";
    //     }
    //     uint j = _i;
    //     uint len;
    //     while (j != 0) {
    //         len++;
    //         j /= 10;
    //     }
    //     bytes memory bstr = new bytes(len);
    //     uint k = len;
    //     while (_i != 0) {
    //         k = k-1;
    //         uint8 temp = (48 + uint8(_i - _i / 10 * 10));
    //         bytes1 b1 = bytes1(temp);
    //         bstr[k] = b1;
    //         _i /= 10;
    //     }
    //     return string(bstr);
    // }
}
