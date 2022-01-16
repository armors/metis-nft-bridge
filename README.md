
```shell

git clone git@github.com:MetisProtocol/mvm.git

cd mvm
  yarn install
  yarn clean
  yarn build

cd ./ops
  docker-compose -f docker-compose-local.yml up -d
  docker-compose -f docker-compose-local.yml down

  # 检测指定服务状态
  docker-compose -f docker-compose-local.yml logs --tail 300 -f verifier

# 测试
cd ./integration-tests
    yarn install
    yarn test:integration test/demo.spec.ts
    
# 查看日志 `docker logs <name of container>`
docker logs ops_l1_chain_1

# 获取合约地址
# 第二层合约地址可以在文档中找到（每次部署都是相同的）
# 第一层需要在日志中查询: 
docker logs ops_relayer_1 |& grep 'Connected to OVM_' | tail -4 


npx hardhat accounts
npx hardhat compile
npx hardhat test --network metis-local
node scripts/sample-script.js
npx hardhat help
npx hardhat clean
```
