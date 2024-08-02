# koa_autorouter

基於 KOA 框架的路由系統

## Purpose

以資料夾管理系統的情況，希望可以做到完全的封裝，資料夾存在即有效，移除資料夾該功能便消失且不影響其他功能。

## Initial

server 啟動時引入模組

```
const autorouter = require('koa_autorouter');
```

開始讀取系統位置

```
autorouter.autoLoadBySystem(`${process.cwd()}/script/system`);
```

設定中介軟體

```
//必定需通過的 Middleware
autorouter.setRequireMiddleware({
    STOPWATCH: require('./middleware/stopwatch.js'),
    GETPARAM: require('./middleware/getparam.js'),
    INPUT: require('./middleware/input.js'),
    OUTPUT: require('./middleware/output.js'),
});
//可選擇須不須通過的 Middleware
autorouter.setOptionMiddleware({
    AUTHORITY: require('./middleware/authority.js'),
});
```

啟動路由

```
//此處的 app 為 koa 的 Instance
autorouter.launchRouter(app);
```

## Using

在`${process.cwd()}/script/system`路徑下的 routes 檔案

```
const autorouter = require('koa_autorouter');

// GET /test
exports.get_test = async function (ctx, next) {
    let param = ctx.request.query;
    ctx.body = `123 321 ${JSON.stringify(param)}`;
}

// POST /test
exports.post_test = async function (ctx, next) {
    let param = ctx.request.body;
    ctx.body = { result: 0, param, msg: '/test call success' };
}

// POST /hh/test
exports.post_hh_test = async function (ctx, next) {
    let param = ctx.request.body;
    ctx.body = `789 987 ${JSON.stringify(param)}`;
}

//未使用選用的中介軟體呼叫
autorouter.routerAdder(exports);
```

在`${process.cwd()}/script/system/testsys`路徑下的 routes 檔案

```
const autorouter = require('koa_autorouter');
const middleWare = autorouter.getMiddleware();

// GET /testsys/test
exports.get_test = async function (ctx, next) {
    let param = ctx.request.query;
    ctx.body = `123 321 ${JSON.stringify(param)}`;
}
middleWare.AUTHORITY(exports);
//以下路由需要額外通過 AUTHORITY 中介軟體檢查
// POST /testsys/test
exports.post_test = async function (ctx, next) {
    let param = ctx.request.body;
    ctx.body = `321 123 ${JSON.stringify(param)}`;
}

// POST /testsys/hh/test
exports.post_hh_test = async function (ctx, next) {
    let param = ctx.request.body;
    ctx.body = `789 987 ${JSON.stringify(param)}`;
}

//有使用選用的中介軟體呼叫
autorouter.routerAdderWithMid(exports);
```

* 以系統為名稱的資料夾，如果資料夾內有 routes.js，那 routes.js exports 的 function 會自動生成路由
  EX:
  系統資料夾 item/routes.js
  exports.get_use = function(ctx, next)
  自動產生路由 'item/use'
* function 名稱的命名規則為
```
`${methods}_${額外的類別(選用)}_${路由名稱}`
```