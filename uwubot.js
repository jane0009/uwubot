const eris = require("eris");
const retry = require("retry-as-promised");
var Promise = require("bluebird");

global.janebot = {};
let janebot = global.janebot;

var reload = require("require-reload")(require);

const fs = require("fs");
const later = require("later");
global.janebot.utils = {};
global.janebot.utils.later = later;
global.janebot.utils.fs = fs;

global.debug = false;
global.info = true;
global.warn = true;
global.error = true;

Object.defineProperty(eris.Message.prototype, "guild", {
  get: function() {
    return this.channel.guild;
  }
});
Object.filter = (obj, predicate) =>
  Object.keys(obj)
    .filter(key => predicate(obj[key]))
    .reduce((res, key) => ((res[key] = obj[key]), res), {});
//REDEFINE CONSOLE.LOG
function pad(num, size) {
  var s = num + "";
  while (s.length < size) s = "0" + s;
  return s;
}
const _log = console.log.bind(console);

console.log = function(...args) {
  let d = new Date();
  let date =
    pad(d.getHours(), 2) +
    ":" +
    pad(d.getMinutes(), 2) +
    ":" +
    pad(d.getSeconds(), 2) +
    "." +
    pad(d.getMilliseconds(), 3);
  _log(date, "|INFO|", ...args);
};
console.warn = function(...args) {
  let d = new Date();
  let date =
    d.getHours() +
    ":" +
    d.getMinutes() +
    ":" +
    d.getSeconds() +
    "." +
    d.getMilliseconds();
  _log(date, "|WARN|", ...args);
};
const _err = console.error.bind(console);
console.error = function(message, ...options) {
  let d = new Date();
  let date =
    d.getHours() +
    ":" +
    d.getMinutes() +
    ":" +
    d.getSeconds() +
    "." +
    d.getMilliseconds();
  _err(date + " |ERROR| " + message, ...options);
};
//

global.round = function(num, dec = 0.0000001) {
  let mult = 1 / dec;
  return Math.round(num * mult) / mult;
};
global.floor = function(num, dec = 0.0000001) {
  let mult = 1 / dec;
  return Math.floor(num * mult) / mult;
};

global.parseArgs = function(str) {
  return str.match(/\\?.|^$/g).reduce(
    (p, c) => {
      if (c === '"') {
        p.quote ^= 1;
      } else if (!p.quote && c === " ") {
        p.a.push("");
      } else {
        p.a[p.a.length - 1] += c.replace(/\\(.)/, "$1");
      }

      return p;
    },
    { a: [""] }
  ).a;
};

const configfile = JSON.parse(JSON.stringify(require("./config.json")));
janebot.keys = {};
let keys = janebot.keys;
keys.osu = configfile.osuapi;
janebot.bot = new eris(configfile.token, {});
janebot.fs = fs;
janebot.commands = {
  eval: {
    module: "base",
    perm: "owner",
    desc: "default js eval function",
    func: function(msg, args, data) {
      let opt;
      if (args.includes("bot.token"))
        args = '"AAAAAAAAAAAAAAAAAAAAAAAA.AAAAAA._AAAAAAAAAAAAAAAAAAAAAAAAAB"';
      try {
        opt = eval(args);
      } catch (e) {
        opt = "!! ERROR !! " + e;
      }
      if (opt == "" && typeof opt == String) {
        opt = "no output...";
      } else if (opt == undefined) {
        opt = "undefined";
      } else if (opt == "") {
        opt = opt + "";
      }
      msg.channel.createMessage("returns: " + opt);
    }
  }
};
janebot.exthooks = {};
janebot.timers = {};
janebot.aliases = {};
janebot.tagbase = {};
let bot = janebot.bot;
bot.on("newListener", (f, list) => {
  if (global.debug) {
    console.log("new event created " + f);
  }
});
//
bot.on("ready", () => {
  if (global.info) {
    console.log("ready");
  }
  if (global.debug) {
    console.log("finish ready");
  }
  //bot.users.get("123601647258697730").getDMChannel().createMessage("loaded")
});

bot.on("messageCreate", msg => {
  if (msg.author.bot) return;
  if (
    msg.content == "j%FALLBACKDEBUGTEST" &&
    msg.author.id == "123601647258697730"
  ) {
    if (global.debug) {
      console.log("debug recieved");
    }
    msg.channel.createMessage("DEBUG RECIEVED..");
  }
  let c = parse(msg);
  //console.log(c)
  c.then(m => {
    //console.log(m);
    if (m.command && janebot.aliases[m.command]) {
      let command = m.command;
      m.command = janebot.aliases[command].command;
      m.args = janebot.aliases[command].args + " " + m.args;
      if (global.debug) {
        console.log(
          "changed alias from " +
            command +
            " to " +
            m.command +
            "(args " +
            janebot.aliases[command].args +
            ")"
        );
      }
    }
    if (m.command && janebot.commands[m.command]) {
      //
      if (janebot.commands[m.command].perm == "owner" && !m.isOwner) {
        msg.channel.createMessage(
          "incorrect permissions, you need `" +
            janebot.commands[m.command].perm +
            "`"
        );
        return;
      }
      if (
        janebot.commands[m.command].perm == "moderator" &&
        (!m.isOwner && !m.isModerator)
      ) {
        msg.channel.createMessage(
          "incorrect permissions, you need `" +
            janebot.commands[m.command].perm +
            "`"
        );
        return;
      }
      janebot.commands[m.command].func(msg, m.args, m);
      if (m.logging) {
        console.log(
          "ran command " +
            m.command +
            (m.args != "" ? " with arguments " + m.args : "") +
            ` (${m.uname}, ${m.uid})`
        );
      }
    }
  });
  if (!msg.guild) return;
  for (hook in janebot.exthooks) {
    //console.log(janebot.exthooks[hook])
    if (janebot.exthooks[hook].event == "messageCreate") {
      janebot.exthooks[hook].func(msg);
    }
  }
});

async function parse(message) {
  //console.log("1")
  let data = {};
  //data.message = message
  data.uname = message.author.username;
  data.uid = message.author.id;
  data.mid = message.id;
  data.cid = message.channel.id;
  data.logging = true;
  if (message.guild) data.gid = message.guild.id;
  //console.log("3")
  //console.log("gconf")
  let pref = "<";
  data.isOwner = "123601647258697730" == message.author.id;
  //console.log("udb")
  data.isModerator = data.isOwner
    ? data.isOwner
    : "" == "moderator" || "" == "owner";
  //console.log(gdb);
  let cont = message.content;
  data.content = cont;
  //console.log(gpref);
  //console.log(gdb[0].dataValues.isGlobalDisabled)
  if (pref && cont.startsWith(pref)) {
    //
    //console.log("HAS PREFIX...")
    let c = cont.split(" ");
    //console.log("c")
    data.command = c[0].substring(pref.length, c[0].length);
    data.args = c.splice(1, c.length).join(" ");
  }
  /* else if (cont.startsWith(gpref) && (!ggdb || !ggdb[0].dataValues.isGlobalDisabled)) {
        //console.log("^^ ggdb")
        //console.log(gdb[0].dataValues.isGlobalDisabled)
        //
        let c = cont.split(" ");
        //console.log("c")
        data.command = c[0].substring(gpref.length, c[0].length)
        data.args = c.splice(1, c.length).join(" ");
    }*/
  //console.log("4")
  return data;
}

//
var files = fs.readdirSync(__dirname + "/modules/");
for (let f of files) {
  if (global.info) {
    console.log("loaded " + f);
  }
  let e = reload(__dirname + "/modules/" + f);
  if (!e.disabled) {
    if (e.commands) {
      for (cmd in e.commands) {
        if (!e.commands[cmd].disabled) {
          if (e.commands[cmd].tags) {
            janebot.tagbase[cmd] = e.commands[cmd].tags
              ? e.commands[cmd].tags
              : [];
            janebot.tagbase[cmd].push(cmd);
            let aliases = Object.filter(global.janebot.aliases, a => {
              if (global.debug) {
                console.log(a.command, cmd);
              }
              return a.command == cmd;
            });
            for (al in aliases) {
              janebot.tagbase[al].push(al);
              janebot.tagbase[al].push(cmd);
            }
          }
          janebot.commands[cmd] = e.commands[cmd];
          janebot.commands[cmd].module = e.name;
        }
      }
    }
    if (e.hooks) {
      for (hook in e.hooks) {
        if (!e.hooks[hook].disabled) {
          janebot.exthooks[hook] = e.hooks[hook];
          janebot.exthooks[hook].module = e.name;
          janebot.exthooks[hook].event = e.hooks[hook].event;
        }
      }
    }
    if (e.timers) {
      for (timer in e.timers) {
        if (!e.timers[timer].disabled) {
          janebot.timers[timer] = e.timers[timer];
          janebot.timers[timer].module = e.name;
        }
      }
    }
    if (e.aliases) {
      for (alias in e.aliases) {
        if (!e.aliases[alias].disabled) {
          janebot.aliases[alias] = e.aliases[alias];
          janebot.aliases[alias].module = e.name;
        }
      }
    }
  }
}
bot.connect();

bot.on("error", e => {
  if (global.error) {
    console.warn(e);
  }
});
bot.on("warn", w => {
  if (global.warn) {
    console.warn(w);
  }
});
process.on("error", e => {
  if (global.error) {
    console.error(e);
  }
});
process.on("uncaughtException", e => {
  if (global.warn) {
    console.warn(e);
  }
});
bot.on("disconnect", () => {
  if (global.warn) {
    console.warn("client disconnected");
  }
});
/*return retry(function(options) {
    return Promise;
}, {
    max:3,
    timeout: 10000,
    match: [ // Must match error signature (ala bluebird catch) to continue
        sequelize.ConnectionError,
        'SQLITE_BUSY'
      ],
      backOffBase: 1000,
      backOffExponent: 1.5,
      report: warn,
      name: 'SEQUELIZE'
})*/
/*let f = setInterval(function(){
    console.log("HM " + bot.uptime)
    
},1000);*/
bot.on("removeListener", (f, list) => {
  if (global.debug) {
    console.log("event removed " + f);
  }
});
for (hook in janebot.exthooks) {
  //console.log("HOOK EVENT " + janebot.exthooks[hook].event)
  if (janebot.exthooks[hook].event != "messageCreate") {
    if (!global.janebot.listnerFuncs) global.janebot.listnerFuncs = {};
    if (!global.janebot.listnerFuncs[hook])
      global.janebot.listnerFuncs[hook] = {};
    global.janebot.listnerFuncs[hook].func = (...args) => {
      janebot.exthooks[hook].func(...args);
    };
    bot.on(
      janebot.exthooks[hook].event,
      global.janebot.listnerFuncs[hook].func
    );
  }
}
for (timer in janebot.timers) {
  if (janebot.timers[timer].type == "interval") {
    let t = setInterval(janebot.timers[timer].func, janebot.timers[timer].time);
    janebot.timers[timer].timer = t;
  } else if (janebot.timers[timer].type == "timeout") {
    let t = setTimeout(janebot.timers[timer].func, janebot.timers[timer].time);
    janebot.timers[timer].timer = t;
  } else if (janebot.timers[timer].type == "schedule") {
    let time = later.parse.cron(janebot.timers[timer].time);
    let t = later.setInterval(janebot.timers[timer].func, time);
    janebot.timers[timer].timer = t;
  }
}
if (global.debug) {
  console.log("REACHED EOF");
}
