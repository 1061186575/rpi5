const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require("express-session");
const FileStore = require("session-file-store")(session);
const logger = require('morgan');
const indexRouter = require('./routes/index');
const { getLocalIP } = require("./utils");
const envFilePath = path.join(__dirname, '.env');

// config
try {
    process.loadEnvFile(envFilePath);
} catch (error) {
    if (error.code !== 'ENOENT') {
        throw error;
    }
}
const username = process.env.LOGIN_USERNAME;
const password = process.env.LOGIN_PASSWORD;
const port = process.env.PORT || 3000;
console.log("服务已启动，http://localhost:" + port);
console.log(`服务已启动，http://${getLocalIP()}:` + port);

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// 把登录信息保存到文件，避免每次重启以后都需要重新登录
const sessionConfig = {
    store: new FileStore({
        path: 'sessionsCache'
    }),
    secret: "NDUyY2E0MTg0NmYyOTViNzM1M2VhMmUwODAyYjcxNjU", // 配置加密字符串，它会在原有加密基础之上和这个字符串拼起来去加密，加密后的字符串作为 session id 的值发送给浏览器。
    name: "rpi_sid", // 返回客户端的 key 的名称，默认为 connect.sid。
    resave: true, // 强制保存 session， 即使它并没有变化。默认为 true。
    saveUninitialized: false, // saveUninitialized 属性为 true 则无论你是否使用 Session，都默认直接分配一个session id 给客户端。为 false 则真正存数据的时候才会分配 session id 给客户端, 默认为 true。
    cookie: {
        path: "/",
        httpOnly: true,
        secure: false,
        maxAge: 1000 * 60 * 60 * 50, // 50h
    }, // 设置返回到前端 cookie 的属性。
    rolling: false, // 在每次请求时强行设置 cookie，这将重置 cookie 过期时间。默认为 false。
};
app.use(session(sessionConfig)); // 使用session


// 无需权限
app.use(express.static(path.join(__dirname, 'public')));

app.post('/login', function (req, res, next) {
    if (!username || !password) {
        return res.send({ code: 1, msg: `请先在 .env 文件设置用户名和密码` })
    }
    if (req.body.user !== username || req.body.password !== password) {
        return res.send({ code: 1, msg: '登录失败' })
    }
    req.session.userInfo = {
        time: Date.now(),
        msg: '登录成功',
    }
    res.send({ code: 0, msg: '登录成功' })
});
app.all("/logout", function (req, res) {
    req.session.userInfo = null;
    req.session.destroy(function (err) {
        if (err) {
            console.log('退出登录err: ', err);
            res.send({ code: 1, msg: '退出登录失败', err });
        } else {
            res.send(`<script>location.replace('/')</script>`)
        }
    })
});

// 权限验证
app.use(function (req, res, next) {
    console.log(req.url)
    if (!req.session.userInfo) {
        res.sendFile(path.resolve('public/login.html'))
        return
    }
    next()
})

// 后面内容需要权限
app.use('/', indexRouter);
app.use('/doc', express.static(path.join(__dirname, 'doc')));


module.exports = app;
