'use strict';

const fs = require('fs');
const Router = require('koa-router');
const tempKey = "KOA_AUTOROUTER_ROUTER_TYPE_KEY";
const targetFileName = "routes.js";

let midList = {};
let midRequire = [];
let midOption = [];

let routerCollect = [];

exports.autoLoadBySystem = function (path) {
    //讓server init設定系統資料夾 直接讀取
    if (!fs.existsSync(path)) {
        console.log("require " + path + ' error!!');
        return null;
    }
    //讀取第二層
    let files = fs.readdirSync(path);
    files.forEach(function (systemName) {
        if (systemName.lastIndexOf('.') !== -1) {
            //不是資料夾
            return;
        }
        let systemLayer = `${path}/${systemName}/${targetFileName}`
        if (fs.existsSync(systemLayer)) {
            this.loadRoutes(systemLayer, `/${systemName}`);
        }
    }.bind(this));
    //讀取第一層
    let firstLayer = `${path}/${targetFileName}`;
    if (fs.existsSync(firstLayer)) {
        this.loadRoutes(firstLayer, "");
    }
}

let routerRule = function (router, param, path, midFunc) {
    for (let realkey in param) {
        console.log(realkey + " ... " + typeof param[realkey]);
        if (typeof param[realkey] === "function" || Array.isArray(param[realkey])) {
            let routermethod = null;
            let key = realkey.toLowerCase();
            let split = key.split("_");
            if (split[0].indexOf("get") >= 0) {
                routermethod = router.get;
            } else if (split[0].indexOf("post") >= 0) {
                routermethod = router.post;
            } else if (split[0].indexOf("all") >= 0) {
                routermethod = router.all;
            } else {
                continue;
            }

            split = split.slice(1);

            let addmethod = function (info) {
                let routerstr = "";
                for (let idx in info) {
                    if (info[idx] !== "") {
                        routerstr = routerstr + "/" + info[idx];
                    }
                }
                if (routerstr === "") {
                    routerstr = "/";
                }

                if (routermethod !== null) {
                    routermethod.apply(router, [routerstr].concat(param[realkey]));
                    console.log(`${routerstr} >>> ${realkey}`);
                }
            }

            addmethod(split);
            if (split[split.length - 1] === "index") {
                split.pop();
                addmethod(split);
            }
        }
        if (typeof param[realkey] === "string") {
            if (midList[realkey]) {
                midList[realkey].func.middlewareName = realkey;
                midFunc(midList[realkey].func);
            }
        }

    }
}

let putMiddleware = function (router, list) {
    for (let idx in list) {
        let realkey = list[idx].key
        midList[realkey].func.middlewareName = realkey;

        router.use(midList[realkey].func);
    }
}
exports.routerAdder = function (exports) {
    exports[tempKey] = "adder";
};
exports.routerAdderWithMid = function (exports) {
    exports[tempKey] = "adderWithMid";
};

exports.loadRoutes = function (path, prefix) {
    let router = new Router({
        prefix: prefix
    });
    let funcTemp = {
        adder: function (param) {
            putMiddleware(router, midRequire);
            putMiddleware(router, midOption);

            routerRule(router, param, path, function () { });
            routerCollect.push(router);
        },
        adderWithMid: function (param) {
            putMiddleware(router, midRequire);

            routerRule(router, param, path, function (func) {
                router.use(func);
            });
            routerCollect.push(router);
        }
    }
    let target = require(path);
    let tempFunc = funcTemp[target[tempKey]];
    if (tempFunc) {
        tempFunc(target);
    }
    //app.use(routesFile.router.routes());
    //不直接塞入 等到流程執行到塞入路由時在統一塞入app
}

//---------------------------------------------------------------------
exports.getMiddleware = function () {
    let midEntry = {};
    for (let idx in midOption) {
        let midObj = midOption[idx];
        midEntry[midObj.key] = midObj.autofunc.bind(midObj);
    }
    return midEntry;
}

let collectMiddleWare = function (middleWareList, bucket) {
    for (let key in middleWareList) {
        let midObj = middleWareList[key];
        midObj.setMidKey(key);
        bucket.push(midObj);
        midList[key] = midObj;
    }
}

exports.setRequireMiddleware = function (middleWareList) {
    //讓server init設定必定經過的中介軟體
    collectMiddleWare(middleWareList, midRequire);
}
exports.setOptionMiddleware = function (middleWareList) {
    //讓server init設定可選用的中介軟體
    collectMiddleWare(middleWareList, midOption);
}

exports.BaseMiddlewareObj = class {
    constructor() {
        this.key = "";
    }
    setMidKey(key) {
        this.key = key;
    }
    autofunc(exports) {
        exports[this.key] = "";
    }
    //-----------------------------------------------------
    desc() {
        return `Please overwrite function of "desc" in ${this.constructor.name}!!`;
    }
    async func(ctx, next) {
        console.log(`Attention!!! This is empty function!!`);
        console.log(`Please overwrite function of "func" in ${this.constructor.name}!!`);
        await next();
    }
}

let getIndexbyName = function (midName) {
    let index = -1;
    for (let idx in midRequire) {
        if (midName === midRequire[idx].key)
            index = idx;
    }
    for (let idx in midOption) {
        if (midName === midOption[idx].key)
            index = midRequire.length + parseInt(idx);
    }
    return parseInt(index);
};

let getNamebyIndex = function (index) {
    let name = "";
    if (name === "" && index < midRequire.length) {
        name = midRequire[index].key;
    }
    index = index - midRequire.length;
    if (name === "" && index < midOption.length) {
        name = midOption[index].key;
    }
    return name;
};
let islaunched = false;

exports.addPrefix = function (str) {
    if (islaunched) {
        throw "Your addPrefix must before then launchRouter!!"
    }
    for (let idx in routerCollect) {
        let router = routerCollect[idx];
        router.prefix(`/${str}`);
    }
};

let routers = {};

exports.launchRouter = function (app) {
    islaunched = true;
    let objCount = midRequire.length + midOption.length;
    let routerList = new Array(objCount).fill("");
    for (let idx in routerList) {
        routerList[idx] = new Array();
    }
    if (objCount === 0) {
        routerList = [[]];
    }
    for (let idx in routerCollect) {
        let router = routerCollect[idx];
        let currentidx = -1;
        if (objCount === 0) {
            currentidx = 0;
        }
        //準備路由表
        for (let funcIdx in router.stack) {
            let funcObj = router.stack[funcIdx];
            let midName = funcObj.stack[0].middlewareName;
            if (midName) {
                //這是中介 取出名字
                currentidx = getIndexbyName(midName);
            }
            else {
                //這是路由
                if (currentidx >= 0) {
                    routerList[currentidx].push({ methods: funcObj.methods[funcObj.methods.length - 1], func: funcObj.path });
                }
            }
        }
        //真正塞入app
        let routes = router.routes();
        app.use(routes);
    }
    //印出路由表
    for (let midIdx in routerList) {
        if (objCount !== 0) {
            let middlewareName = getNamebyIndex(midIdx);
            console.log(`USE\t${middlewareName}\t${midList[middlewareName].desc()}`);
            routers[middlewareName] = "USE";
        }
        for (let funcIdx in routerList[midIdx]) {
            let data = routerList[midIdx][funcIdx];
            if (data.methods === "UNSUBSCRIBE")
                data.methods = "ALL";
            console.log(`${data.methods}\t${data.func}`);
            routers[data.func] = data.methods;
        }
    }
};

exports.getRouters = function () {
    return routers;
}