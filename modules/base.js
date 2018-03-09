var reload = require("require-reload")(require);
var fs = require("fs");
module.exports = {
  name: "base",
  commands: {
    ping: {
      desc: "obligatory ping command",
      perm: "all",
      func: function(msg, args, data) {
        msg.channel.createMessage("Pong.").then(m => {
          let output = (m.timestamp - msg.timestamp) * 1000;
          if (msg.author.id == "163024083364216832") {
            output = "eric doesn't have a sense of humor ";
          }
          m.edit("Pong, took `" + output + "μs`");
        });
      }
    },
    help: {
      desc: "obligatory help command",
      perm: "all",
      func: function(msg, args, data) {
        strArr = [];
        let str = "```md\n";
        for (cmd in global.janebot.commands) {
          let aliases = Object.filter(global.janebot.aliases, a => {
            console.log(a.command, cmd);
            return a.command == cmd;
          });
          if (
            global.janebot.commands[cmd].perm == "owner" ||
            global.janebot.commands[cmd].perm == "moderator"
          ) {
            if (data.isOwner || data.isModerator) {
              str +=
                "\t" + cmd + " (" + global.janebot.commands[cmd].module + ")\n";
              let size = Object.keys(aliases).length;
              console.log(aliases, size);
              if (size) {
                let aliasesArr = [];
                for (al in aliases) {
                  aliasesArr.push(al);
                }
                str += "[" + aliasesArr + "]\n";
              }
              if (
                global.janebot.commands[cmd] &&
                global.janebot.commands[cmd].desc
              ) {
                str += "##\t" + global.janebot.commands[cmd].desc;
                if (global.janebot.commands[cmd].perm != "all") {
                  str += " [" + global.janebot.commands[cmd].perm + "]";
                }
                str += "\n";
              }
            }
          } else {
            str +=
              "\t" + cmd + " (" + global.janebot.commands[cmd].module + ")\n";
            let size = Object.keys(aliases).length;
            console.log(aliases, size);
            if (size) {
              let aliasesArr = [];
              for (al in aliases) {
                aliasesArr.push(al);
              }
              str += "aliases: " + aliasesArr + "\n";
            }
            if (
              global.janebot.commands[cmd] &&
              global.janebot.commands[cmd].desc
            ) {
              str += "##\t" + global.janebot.commands[cmd].desc;
              if (global.janebot.commands[cmd].perm != "all") {
                str += " [" + global.janebot.commands[cmd].perm + "]";
              }
              str += "\n";
            }
          }
          if (str.length >= 1900) {
            strArr.push(str + "```");
            str = "```md\n";
          }
        }
        str += "```";
        if (str == "```md\n```") {
          str = "";
        }
        if (str != "") strArr.push(str);
        msg.author.getDMChannel().then(c => {
          for (let a of strArr) {
            c.createMessage(a);
          }
        });
        msg.channel.createMessage("Check your DMs.");
      }
    },
    restart: {
      desc: "actually just kills the bot",
      perm: "owner",
      func: async function(msg, args, data) {
        let m = await msg.channel.createMessage(
          "<:bigthink:391684350535663616>"
        );
        process.exit();
      }
    },
    reload: {
      desc: "reloads a module",
      perm: "owner",
      func: function(msg, args, data) {
        //if(!data.isOwner) return;
        let janebot = global.janebot;
        if (!args.endsWith(".js")) args = args + ".js";
        var files = janebot.fs.readdirSync(__dirname);
        let is = false;
        for (let f of files) {
          if (args == f) is = true;
        }
        if (is) {
          let path = require("path");
          let e = {};
          try {
            e = reload(path.join(__dirname, args));
          } catch (err) {
            msg.channel.createMessage(
              "failed to reload module: ```bash\n" + err.stack + "```"
            );
            console.error("\n", err.stack);
            return;
          }
          if (e.commands) {
            for (cmd in e.commands) {
              if (!e.commands[cmd].disabled) {
                janebot.commands[cmd] = e.commands[cmd];
                janebot.commands[cmd].module = e.name;
              } else {
                delete janebot.commmands[cmd];
              }
            }
          }
          if (e.hooks) {
            for (hook in e.hooks) {
              if (!e.hooks[hook].disabled) {
                janebot.exthooks[hook] = e.hooks[hook];
                janebot.exthooks[hook].module = e.name;
                janebot.exthooks[hook].event = e.hooks[hook].event;
              } else {
                delete janebot.exthooks[hook];
              }
            }
          }
          for (timer in global.janebot.timers) {
            //console.log(global.janebot.timers[timer].timer)
            if (global.janebot.timers[timer].type == "schedule") {
              global.janebot.timers[timer].timer.clear();
            } else {
              clearInterval(global.janebot.timers[timer].timer);
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
              if (!e.timers[timer].disabled) {
                janebot.aliases[alias] = e.aliases[alias];
                janebot.aliases[alias].module = e.name;
              } else {
                delete janebot.aliases[alias];
              }
            }
          }
          for (hook in janebot.exthooks) {
            if (janebot.exthooks[hook].event != "messageCreate") {
              if (!global.janebot.listnerFuncs)
                global.janebot.listnerFuncs = {};
              if (!global.janebot.listnerFuncs[hook])
                global.janebot.listnerFuncs[hook] = {};
              if (!global.janebot.listnerFuncs[hook].func)
                global.janebot.listnerFuncs[hook].func = (...args) => {
                  janebot.exthooks[hook].func(...args);
                };
              global.janebot.bot.removeListener(
                janebot.exthooks[hook].event,
                global.janebot.listnerFuncs[hook].func
              );
              global.janebot.bot.on(
                janebot.exthooks[hook].event,
                global.janebot.listnerFuncs[hook].func
              );
            }
          }
          for (timer in janebot.timers) {
            if (janebot.timers[timer].type == "interval") {
              let t = setInterval(
                janebot.timers[timer].func,
                janebot.timers[timer].time
              );
              janebot.timers[timer].timer = t;
            } else if (janebot.timers[timer].type == "timeout") {
              let t = setTimeout(
                janebot.timers[timer].func,
                janebot.timers[timer].time
              );
              janebot.timers[timer].timer = t;
            } else if (janebot.timers[timer].type == "schedule") {
              let time = global.janebot.utils.later.parse.cron(
                janebot.timers[timer].time
              );
              let t = global.janebot.utils.later.setInterval(
                janebot.timers[timer].func,
                time
              );
              janebot.timers[timer].timer = t;
            }
          }
          console.log(`reloaded ${args}.`);
          msg.channel.createMessage("reloaded " + args + ".");
        } else {
          console.log(`failed to reload ${args}.`);
          msg.channel.createMessage("module not found.");
        }
      }
    },
    unload: {
      desc: "removes all commands and hooks from a module",
      perm: "owner",
      func: function(msg, args, data) {
        //if(!data.isOwner) return;
        //msg.channel.createMessage("WIP")
        let c = args.split(" ");
        if (c[0] == "mn") {
          msg.channel.createMessage("WIP");
        } else {
          let janebot = global.janebot;
          if (!args.endsWith(".js")) args = args + ".js";
          var files = janebot.fs.readdirSync(__dirname);
          let is = false;
          for (let f of files) {
            if (args == f) is = true;
          }
          if (is) {
            let path = require("path");
            let e = reload(path.join(__dirname, args));
            if (e.commands) {
              for (cmd in e.commands) {
                janebot.commands[cmd] = undefined;
                delete janebot.commands[cmd];
                //janebot.commands[cmd].module = undefined
              }
            }
            if (e.hooks) {
              for (hook in e.hooks) {
                janebot.exthooks[hook] = undefined;
                delete janebot.exthooks[hook];
                //janebot.exthooks[hook].module = undefined
              }
            }
            if (e.timers) {
              for (timer in e.timers) {
                janebot.timers[timer] = undefined;
                delete janebot.timers[timer];
              }
            }
            if (e.aliases) {
              for (alias in e.aliases) {
                delete janebot.aliases[alias];
              }
            }
            //console.log(janebot.commands, janebot.exthooks)
            for (hook in janebot.exthooks) {
              if (janebot.exthooks[hook].event != "messageCreate") {
                if (!global.janebot.listnerFuncs)
                  global.janebot.listnerFuncs = {};
                if (!global.janebot.listnerFuncs[hook])
                  global.janebot.listnerFuncs[hook] = {};
                if (!global.janebot.listnerFuncs[hook].func)
                  global.janebot.listnerFuncs[hook].func = (...args) => {
                    janebot.exthooks[hook].func(...args);
                  };
                global.janebot.bot.removeListener(
                  janebot.exthooks[hook].event,
                  global.janebot.listnerFuncs[hook].func
                );
              }
            }
            for (timer in janebot.timers) {
              if (janebot.timers[timer].type == "interval") {
                clearInterval(global.janebot.timerFuncs[timer].timer);
              } else if (janebot.timers[timer].type == "schedule") {
                global.janebot.timerFuncs[timer].timer.clear();
              }
            }
            msg.channel.createMessage("removed " + args + ".");
          } else {
            msg.channel.createMessage("module not found.");
          }
        }
      }
    },
    info: {
      desc: "bot info",
      perm: "all",
      func: function(msg, args, data) {
        let str =
          "```md\n# \tjanebot\nthis used to be janebot actually now its just an osu tracker\n\tstill WIP.\nmade by jane#0009\nsome other stuff\ngh: https://github.com/janeptrv/uwubot\ninvite: https://discordapp.com/oauth2/authorize?client_id=267386152321941505&scope=bot```";
        msg.channel.createMessage(str);
      }
    },
    pull: {
      desc: "pulls from github",
      perm: "owner",
      func: async function(msg, args, data) {
        let exec = require("child_process").exec;
        let arr = [
          "/mnt/tera/heckheating",
          "/mnt/tera/bots/janebot",
          "/home/jane/rest"
        ];
        if (args == "g") {
        } else {
          exec("cd uwubot; git pull", (e, out, err) => {
            if (e) {
              msg.channel.createMessage("Error\n```" + e + "```");
            } else {
              msg.channel.createMessage("```bash\n" + out + "\n```");
            }
          });
        }
      }
    },
    shell: {
      desc: "runs command on host",
      perm: "moderator",
      func: async function(msg, args, data) {
        let child = require("child_process");
        let closeFunc = function(shell) {
          msg.channel.createMessage(
            "automatically closed shell after 30 seconds of inactivity"
          );
          shell.stdin.end();
        };
        if (!global.janebot.shell) global.janebot.shell = {};
        if (!global.janebot.shellTimeouts) global.janebot.shellTimeouts = {};
        if (!global.janebot.shell[msg.guild.id]) {
          msg.channel.createMessage("Spawning new shell...");
          let shell = child.spawn("bash");
          global.janebot.shell[msg.guild.id] = shell;
          let timeout = setTimeout(() => {
            closeFunc(shell);
          }, 30000);
          global.janebot.shellTimeouts[msg.guild.id] = timeout;
          console.log("spawned new shell for " + msg.guild.id);
          shell.stdout.on("data", data => {
            console.log("shell output for " + msg.guild.id + ": " + data);
            msg.channel.createMessage("```\n" + data + "\n```");
          });

          shell.stderr.on("data", data => {
            console.warn("shell error for " + msg.guild.id + ": " + data);
            msg.channel.createMessage("```\n(errored)\n" + data + "\n```");
          });
          shell.on("close", code => {
            console.log("shell for " + msg.guild.id + " closed");
            msg.channel.createMessage("Shell closed with exit code " + code);
            delete global.janebot.shell[msg.guild.id];
          });
        }
        if (global.janebot.shell[msg.guild.id]) {
          let sh = global.janebot.shell[msg.guild.id];
          let to = global.janebot.shellTimeouts[msg.guild.id];
          clearTimeout(to);
          delete global.janebot.shellTimeouts[msg.guild.id];
          if (args.startsWith("sudo")) {
            msg.channel.createMessage("sudo is not supported.");
            return;
          }
          console.log(`ran shell with args ${args}`);
          if (!args.endsWith("\n")) args += "\n";
          sh.stdin.write(args);
          if (!args.includes("exit")) {
            console.log("reset timer");
            to = setTimeout(() => {
              closeFunc(sh);
            }, 30000);
            global.janebot.shellTimeouts[msg.guild.id] = to;
          }
          //sh.stdin.end();
        } else {
          msg.channel.createMessage("something borked. (shell not found)");
        }
        /*require('child_process').exec(args, (e, out, err) => {
                    if (e) {
                        msg.channel.createMessage("Error\n```" + e + "```");
                    } else {
                        msg.channel.createMessage("```bash\n" + out + "\n```");
                    }
                });*/
      }
    },
    hclist: {
      desc: "lists all commands and hooks",
      perm: "owner",
      func: function(msg, args, data) {
        strArr = [];
        let str = "```md\ncommands\n";
        for (cmd in global.janebot.commands) {
          str +=
            "\t" + cmd + " (" + global.janebot.commands[cmd].module + ")\n";
          if (
            global.janebot.commands[cmd] &&
            global.janebot.commands[cmd].desc
          ) {
            str += "##\t" + global.janebot.commands[cmd].desc;
            if (global.janebot.commands[cmd].perm != "all") {
              str += " [" + global.janebot.commands[cmd].perm + "]";
            }
            str += "\n";
          }
          if (str.length >= 1900) {
            strArr.push(str + "```");
            str = "```md\n";
          }
        }
        str += "hooks \n";
        for (cmd in global.janebot.exthooks) {
          str +=
            "\t" +
            cmd +
            " - " +
            global.janebot.exthooks[cmd].event +
            " (" +
            global.janebot.exthooks[cmd].module +
            ")\n";
          if (str.length >= 1900) {
            strArr.push(str + "```");
            str = "```md\n";
          }
        }
        str += "timers \n";
        for (timer in global.janebot.timers) {
          str +=
            "\t" +
            timer +
            " - " +
            global.janebot.timers[timer].type +
            ' - "' +
            global.janebot.timers[timer].time +
            '" (' +
            global.janebot.timers[timer].module +
            ")\n";
          if (str.length >= 1900) {
            strArr.push(str + "```");
            str = "```md\n";
          }
        }
        str += "aliases \n";
        for (alias in global.janebot.aliases) {
          str +=
            "\t" +
            alias +
            " - " +
            global.janebot.aliases[alias].command +
            " " +
            global.janebot.aliases[alias].args +
            " (" +
            global.janebot.aliases[alias].module +
            ")\n";
          if (str.length >= 1900) {
            strArr.push(str + "```");
            str = "```md\n";
          }
        }
        str += "```";
        if (str == "```md\n```") {
          str = "";
        }
        if (str != "") strArr.push(str);
        for (let a of strArr) {
          msg.channel.createMessage(a);
        }
      }
    }
  },
  hooks: {
    debugLogging: {
      disabled: true,
      event: "messageCreate",
      func: function(msg) {
        console.log(
          (msg.guild ? msg.guild.name : "DM") +
            "||" +
            msg.author.username +
            ": " +
            msg.content
        );
      }
    }
  },
  timers: {
    example: {
      disabled: true,
      type: "interval",
      time: 5000,
      func: function() {
        console.log("test");
      }
    },
    status: {
      type: "interval",
      time: 60000,
      func: function() {
        let bot = global.janebot.bot;
        let presences = [
          `osu! | <help`,
          `PP farming... | <help`,
          `FC'ing Centipede | <help`,
          `clicking some circles | <help`,
          `Elite Beat Agents | <help`,
          `with an osu!tablet | <help`,
          `beating slice's scores... | <help`
        ]
        bot.editStatus("online", {
          name: presences[Math.floor(Math.random()*presences.length)],
          type: 0
        });
      }
    }
  },
  aliases: {
    test: {
      disabled: true,
      command: "ping",
      args: ""
    },
    test2: {
      disabled: true,
      command: "config",
      args: "guild"
    }
  }
};
