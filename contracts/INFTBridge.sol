// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/**
 * @title NFTBridge
 */
interface INFTBridge {

    function configNFT(
        address L1NFT, 
        address L2NFT, 
        uint256 originNFTChainId
    ) 
        external;
    
    function finalizeDeposit(
        address _nft,
        address _from,
        address _to,
        uint256[] calldata _ids,
        uint256[] calldata _amounts,
        uint8 nftStandard
    )
        external;
}
