
```shell
1.先检出此库
git clone git@github.com:MetisProtocol/mvm.git
2.进入目录，执行下面命令
cd mvm
  yarn install
  yarn clean
  yarn build
3.进入ops目录，启动服务就成
cd ./ops
  docker-compose -f docker-compose-local.yml build
  启动docker服务
  docker-compose -f docker-compose-local.yml up -d
  停止docker服务
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

4.回到代码目录，先编译，再执行脚本
npm run compile
node scripts/test.js

```

| Node | Port |
| --- | --- |
| L2 (Optimism dev node) | 	8545 |
| L1 (hardhat dev node) | 	9545 |
