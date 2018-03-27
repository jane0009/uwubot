let fs = require("fs");
let ojsama = require("ojsama");
let node_osu = require("node-osu");
let path = require("path");
let osuapi = new node_osu.Api(global.janebot.keys.osu);
let listening = {};
let tracking = {};
let set = {};
let map_data = {};
let dataFolder = path.join("/home/jane/uwubot", "data");
let cfg, data;
try {
  cfg = require(path.join(dataFolder, "osutracking.json"));
}
catch (e) {
  fs.writeFileSync(path.join(dataFolder, "osutracking.json"), "{}");
}
try {
  data = require(path.join(dataFolder, "osudata.json"));
}
catch (e) {
  fs.writeFileSync(path.join(dataFolder, "osudata.json"), "{}");
}
if (cfg.set) {
  tracking = cfg.track || {};
  set = cfg.set || {};
  if(cfg.mapdata) {
    map_data = cfg.mapdata || {};
  }
  else {
    map_data = data;
  }
} else {
  tracking = cfg || {};
}
module.exports = {
  disabled: false,
  name: "osu!",
  commands: {
    set: {
      desc: "set osu! tracked user",
      perm: "all",
      func: async function(msg, args, data) {
        let c = global.parseArgs(args);
        switch (c[0]) {
          case "remove":
            delete set[msg.author.id];
            msg.channel.createMessage("removed your current osu! user.");
            break;
          case "help":
            msg.channel.createMessage(
              "usage:\n```\n<set [name]\n<set remove\n```"
            );
            break;
          default:
            if (set[msg.author.id]) {
              msg.channel.createMessage(
                "changed user from " + set[msg.author.id] + " to " + c[0]
              );
            } else {
              msg.channel.createMessage("set user to " + c[0]);
            }
            set[msg.author.id] = c[0];
        }
        fs.writeFileSync(
          path.join(dataFolder, "osutracking.json"),
          JSON.stringify({ track: tracking, set: set})
        );
        fs.writeFileSync(
          path.join(dataFolder, "osudata.json"),
          JSON.stringify(map_data)
        );
      }
    },
    recent: {
      desc: "gets last X plays for a user",
      perm: "all",
      func: async function(msg, args, data) {
        let c = global.parseArgs(args);
        let name = c[0];
        let cnum = parseInt(c[1])
          ? parseInt(c[1])
          : parseInt(c[0]) ? parseInt(c[0]) : 5;
        let isStats = false;
        if (c[0] == "stats") {
          isStats = true;
          name = c[1];
        }
        if (!name || cnum == undefined) {
          if (set[msg.author.id]) {
            name = set[msg.author.id];
          } else {
            msg.channel.createMessage("not enough parameters...");
            return;
          }
        }
        let user = await osuapi.getUser({
          u: name
        });
        if (!user) {
          msg.channel.createMessage("could not find a user by that name...");
          return;
        }
        //console.log(user);
        let userScores;
        try {
          userScores = isStats
            ? []
            : await osuapi.getUserRecent({
                u: name,
                limit: cnum
              });
        } catch (e) {
          if (global.debug) {
            console.warn(name, e);
          }
        }
        if (!userScores[0]) {
          msg.channel.createMessage({
            embed: {
              title: `${user.name} (userid: ${user.id})`,
              thumbnail: {
                url: `https://a.ppy.sh/${user.id}`
              },
              color: 16738740,
              //description: `${isStats ? "" : "**could not find recent scores for this user**"}`,
              fields: [
                {
                  name: "Rank",
                  value: `#${user.pp.rank}`,
                  inline: true
                },
                {
                  name: "Country Rank",
                  value: `#${user.pp.countryRank}`,
                  inline: true
                },
                {
                  name: "PP",
                  value: user.pp.raw,
                  inline: true
                },
                {
                  name: "Level",
                  value: `${global.round(user.level, 1)} (${global.round(
                    user.level - global.round(user.level, 1),
                    0.0001
                  ) * 100}%)`,
                  inline: true
                },
                {
                  name: "Total Plays",
                  value: user.counts.plays,
                  inline: true
                },
                {
                  name: "Accuracy",
                  value: `${user.accuracyFormatted}`,
                  inline: true
                },
                {
                  name: "Ranked Score",
                  value: user.scores.ranked,
                  inline: true
                },
                {
                  name: "Total Score",
                  value: user.scores.total,
                  inline: true
                },
                {
                  name: "Maps with 'SS'",
                  value: user.counts.SS,
                  inline: true
                },
                {
                  name: "Maps with 'S'",
                  value: user.counts.S,
                  inline: true
                },
                {
                  name: "Maps with 'A'",
                  value: user.counts.A,
                  inline: true
                },
                isStats
                  ? {
                      name: "\u200b",
                      value: "\u200b"
                    }
                  : {
                      name: "Could not find recent scores for this user!",
                      value: "\u200b"
                    }
              ]
            }
          });
          return;
        }
        //console.log(userScores);
        let scores = userScores;
        //let user = listening[m.id].user;
        let num = 0;
        //console.log(scores[num]);
        let mapL = await osuapi.getBeatmaps({
          b: scores[num].beatmapId
        });
        let map = mapL[0];
        let m = await msg.channel.createMessage({
          embed: {
            title: `${user.name} (userid: ${user.id})`,
            thumbnail: {
              url: `https://b.ppy.sh/thumb/${map.beatmapSetId}.jpg`
            },
            color: 16738740,
            description: `use \`osu <user> stats\` to get player stats\n[${
              map.title
            } by ${map.artist} [${
              map.version
            }]](https://osu.ppy.sh/beatmapsets/${map.beatmapSetId}/#osu/${
              map.id
            })\n mapped by ${map.creator}\n${global.round(
              map.difficulty.rating,
              0.01
            )} stars\n(${num + 1} of ${scores.length})`,
            fields: [
              {
                name: "Rank",
                value: `#${user.pp.rank}`,
                inline: true
              },
              {
                name: "Country Rank",
                value: `#${user.pp.countryRank}`,
                inline: true
              },
              {
                name: "PP",
                value: scores[num].pp ? scores[num].pp : user.pp.raw,
                inline: true
              },
              {
                name: "Level",
                value: `${global.round(user.level, 1)} (${global.round(
                  user.level - global.round(user.level, 1),
                  0.0001
                ) * 100}%)`,
                inline: true
              },
              {
                name: "Score",
                value: scores[num].score,
                inline: true
              },
              {
                name: "Max Combo",
                value: `${scores[num].maxCombo} of ${map.maxCombo}`,
                inline: true
              },
              {
                name: "300s Hit",
                value: scores[num].counts["300"],
                inline: true
              },
              {
                name: "Misses",
                value: scores[num].counts.miss,
                inline: true
              },
              {
                name: "Mods",
                value: "[" + scores[num].mods + "]",
                inline: true
              },
              {
                name: "Rank",
                value: scores[num].rank,
                inline: true
              }
            ]
          }
        });
        //let m = await msg.channel.createMessage("test");
        m.addReaction("⬅");
        m.addReaction("➡");
        m.addReaction("🇽");
        listening[m.id] = {};
        listening[m.id].id = msg.author.id;
        listening[m.id].scores = userScores ? userScores : [];
        listening[m.id].user = user ? user : {};
        listening[m.id].currentMap = 0;
      }
    },
    track: {
      desc: "control which users are tracked in the current channel",
      perm: "all",
      func: async function(msg, args, data) {
        let c = global.parseArgs(args);
        let cmd = c[0];
        let name = c[1];
        let cnum = parseInt(c[1]) ? parseInt(c[1]) : 50;
        if (!tracking[msg.guild.id]) tracking[msg.guild.id] = {};
        if (!tracking[msg.guild.id][msg.channel.id])
          tracking[msg.guild.id][msg.channel.id] = {};
        switch (cmd) {
          case "add":
            let user = await osuapi.getUser({
              u: name
            });
            let userScores;
            try {
              userScores = await osuapi.getUserRecent({
                u: name,
                limit: cnum
              });
            } catch (e) {
              if (global.debug) {
                console.warn(name, e);
              }
            }
            if (user) {
              //console.log(user);
              //console.log(userScores);
              if (tracking[msg.guild.id][msg.channel.id][name]) {
                msg.channel.createMessage(
                  "This user is already being tracked!"
                );
                return;
              }
              tracking[msg.guild.id][msg.channel.id][name] = {};
              tracking[msg.guild.id][msg.channel.id][name].user = {
                id: user.id,
                username: user.name,
                scores: user.scores.total
              };
              tracking[msg.guild.id][msg.channel.id][name].latest = userScores;
              msg.channel.createMessage("Now tracking " + name);
              fs.writeFileSync(
                path.join(dataFolder, "osutracking.json"),
                JSON.stringify({ track: tracking, set: set})
              );
              fs.writeFileSync(
                path.join(dataFolder, "osudata.json"),
                JSON.stringify(map_data)
              );
            } else {
              msg.channel.createMessage(
                "A user named " + name + " does not exist."
              );
            }
            break;
          case "remove":
            msg.channel.createMessage("Removing tracking for " + name);
            delete tracking[msg.guild.id][msg.channel.id][name];
            fs.writeFileSync(
              path.join(dataFolder, "osutracking.json"),
              JSON.stringify({ track: tracking, set: set})
            );
            fs.writeFileSync(
              path.join(dataFolder, "osudata.json"),
              JSON.stringify(map_data)
            );
            break;
          case "get":
          case "list":
            let tr = tracking[msg.guild.id][msg.channel.id];
            let usrs = [];
            for (let u in tr) {
              usrs.push(u);
            }
            msg.channel.createMessage("```\n" + usrs + "\n```");
            break;
          default:
            msg.channel.createMessage(
              "```\nuse <track add to add a user\nuse <track remove to remove a user\nuse <track [get|list] to list all tracked users\n```"
            );
        }
      }
    },
    cache: {
      desc: "clears the cache",
      perm: "owner",
      func: async function(msg,args,data) {
        let total = args.split(" ")[0] == "true"
        msg.channel.createMessage("wiping cache... full wipe is " + (total ? "on" : "off"))
        gc(total);
      }
    }
  },
  hooks: {
    reactionAddListener: {
      event: "messageReactionAdd",
      func: async function(m, e, u) {
        func(m, e, u);
      }
    },
    reactionRemListener: {
      event: "messageReactionRemove",
      func: async function(m, e, u) {
        func(m, e, u);
      }
    }
  },
  timers: {
    queryapi: {
      disabled: false,
      type: "interval",
      time: 120000,
      func: function() {
        queryApi();
      }
    },
    garbagecollect: {
      type: "schedule",
      time: "@daily",
      func: async function() {
        await backup();
        await gc(false);
      }
    }
  },
  aliases: {
    osu: {
      disabled: false,
      command: "recent",
      args: "stats"
    }
  }
};
let queryApi = async function() {
  let dat = {};
  for (guild in tracking) {
    for (channel in tracking[guild]) {
      for (user in tracking[guild][channel]) {
        //console.log(tracking[guild][channel]);
        let name = tracking[guild][channel][user].user.username;
        let data;
        if (!dat[user]) {
          dat[user] = {};
          try {
            data = await osuapi.getUserRecent({
              u: name,
              limit: 5
            });
          } catch (e) {
            if (global.debug) {
              console.warn(name, e);
            }
          }
          //console.log("dat", name, data);
          let newMapSet = [];
          if (
            !tracking[guild][channel][user].latest ||
            !tracking[guild][channel][user].latest[0]
          ) {
            newMapSet = data;
          } else {
            //console.log("f");
            for (map in data) {
              let ts = data[map].raw_date;
              let ots = tracking[guild][channel][user].latest[0].raw_date;
              //console.log("stamp", ts, ots);
              if (new Date(ts).getTime() > new Date(ots).getTime()) {
                newMapSet.push(data[map]);
              }
            }
          }
          //console.log("nms", name, newMapSet);
          if (newMapSet && newMapSet[0]) {
            dat[user].chans = {};
            dat[user].chans[guild] = [channel];
            dat[user].maps = newMapSet;
            tracking[guild][channel][user].latest = newMapSet;
          }
        } else {
          if (!dat[user].chans) dat[user].chans = {};
          if (dat[user].chans[guild]) {
            dat[user].chans[guild].push(channel);
          } else {
            dat[user].chans[guild] = [channel];
          }
        }
      }
    }
  }
  fs.writeFileSync(
    path.join(dataFolder, "osutracking.json"),
    JSON.stringify({ track: tracking, set: set})
  );
  fs.writeFileSync(
    path.join(dataFolder, "osudata.json"),
    JSON.stringify(map_data)
  );
  for (user in dat) {
    for (map in dat[user].maps) {
      if (
        dat[user].maps[map].rank != "F" ||
        dat[user].maps[map].maxCombo > 200
      ) {
        distance(dat[user].chans, dat[user].maps[map], user);
      }
    }
  }
};
function distance(chans, ms, name) {
  setTimeout(() => {
    pushLatest(chans, ms, name);
  }, 30000);
}
function getColor(rank) {
  switch (rank) {
    case "XH":
    case "SH":
      return parseInt(0xffffff, 10);
      break;
    case "X":
    case "S":
      return parseInt(0xfef337, 10);
      break;
    case "A":
      return parseInt(0x46e424, 10);
      break;
    case "B":
      return parseInt(0x3b73ff, 10);
      break;
    case "C":
      return parseInt(0xff35f0, 10);
      break;
    case "D":
    case "F":
      return parseInt(0xf33836, 10);
      break;
    default:
      return parseInt(0xf33836, 10);
  }
}
async function backup() {
  fs.writeFileSync(
    path.join(dataFolder, ".osubackup.json"),
    JSON.stringify({ track: tracking, set: set})
  );
}
async function gc(total = false) {
  for (map in map_data) {
    if (map_data[map].date + 259200000 < new Date() || total) {
      if (global.info) {
        console.log("deleting map " + map);
      }
      delete map_data[map];
    }
  }
  fs.writeFileSync(
    path.join(dataFolder, "osutracking.json"),
    JSON.stringify({ track: tracking, set: set})
  );
  fs.writeFileSync(
    path.join(dataFolder, "osudata.json"),
    JSON.stringify(map_data)
  );
}
async function pushLatest(chans, score, usern) {
  //console.log("\n\n\n\n\n");
  let user = await osuapi.getUser({
    u: usern
  });
  let mapL = await osuapi.getBeatmaps({
    b: score.beatmapId
  });
  //console.log(score);
  let map = mapL[0];
  //console.log(score,map);
  let mods = score.raw_mods;
  if (map.mode == "Standard") {
    if (!map_data[score.beatmapId]) map_data[score.beatmapId] = {};
    if (!map_data[score.beatmapId][mods]) {
      let url = `https://osu.ppy.sh/osu/${score.beatmapId}`;
      let exec = require("child_process").exec;
      let mdata;
      await exec(`curl ${url}`, (e, out, err) => {
        if (e) {
          if (global.error) {
            console.error(e);
          }
        }
        //console.log(out);
        mdata = out;
        let stars;
        if (mdata != undefined) {
          let sdata = new ojsama.parser().feed(mdata);
          stars = new ojsama.diff().calc({ map: sdata.map, mods: mods });
        }
        if (stars) {
          map_data[score.beatmapId].map = stars.map;
          map_data[score.beatmapId].date = new Date().getTime();
          stars.map = {};
        }
        map_data[score.beatmapId][mods] = stars || {};
      });
      //console.log(mdata);
    }
    fs.writeFileSync(
      path.join(dataFolder, "osutracking.json"),
      JSON.stringify({ track: tracking, set: set})
    );
    fs.writeFileSync(
      path.join(dataFolder, "osudata.json"),
      JSON.stringify(map_data)
    );
    wrap(score, mods, map, chans, user, usern);
  }
}
function wrap(score, mods, map, chans, user, usern, iter = 0) {
  if (map_data[score.beatmapId][mods] && map_data[score.beatmapId].map) {
    let pp;
    let stars = map_data[score.beatmapId][mods];
    stars.map = map_data[score.beatmapId].map;
    map_data[score.beatmapId].date = new Date().getTime();
    try {
      pp = ojsama.ppv2({
        stars: stars,
        combo: parseInt(score.maxCombo),
        nmiss: parseInt(score.counts.miss),
        n300: parseInt(score.counts["300"]),
        n100: parseInt(score.counts["100"]),
        n50: parseInt(score.counts["50"]),
        acc_percent: determineAcc(map.mode, score.counts, false),
        max_combo: parseInt(map.maxCombo)
      });
    } catch (e) {
      console.error(e);
      pp = "unknown pp amount (calculation failed)";
    }
    for (guild in chans) {
      let nchans = chans[guild];
      for (chan in nchans) {
        //console.log(guild,chan)
        createEmbed(score, mods, map, guild, nchans[chan], user, usern, pp);
      }
    }
  } else {
    if (global.debug) {
      console.log(
        "waiting 30s before creating embed... [" +
          score.beatmapId +
          ", " +
          usern +
          "]"
      );
      if (iter < 20) {
        setTimeout(() => {
          wrap(score, mods, map, chans, user, usern, iter + 1);
        }, 30000);
      } else {
        console.warn("could not embed play after 20 tries.");
      }
    }
  }
}
function createEmbed(score, mods, map, gid, cid, user, usern, pp) {
  /*let scores = await osuapi.scores.get(score.id, score.mods, 1, usern, nodesu.LookupType.string);
    console.log(scores);*/
  //console.log(user, usern);
  //console.log("new score " + usern + " " + score.id, map);
  if (!map) {
    global.janebot.bot.guilds
      .get(gid)
      .channels.get(cid)
      .createMessage(
        "there was a new map for " +
          usern +
          ", but it could not be queried via the API. The ID is " +
          score.id
      );
    return;
  }
  var date = new Date(null);
  date.setSeconds(map.time.total); // specify value for SECONDS here
  var result = date.toISOString().substr(11, 8);
  let chan = global.janebot.bot.guilds.get(gid).channels.get(cid);
  chan.createMessage({
    embed: {
      title: `new! for user ${
        user.name
      } in osu!${map.mode.toLowerCase()} (userid: ${user.id})`,
      thumbnail: {
        url: `https://b.ppy.sh/thumb/${map.beatmapSetId}.jpg`
      },
      color: getColor(score.rank),
      description: `[${map.title} by ${map.artist} [${
        map.version
      }]](https://osu.ppy.sh/beatmapsets/${map.beatmapSetId}/#osu/${map.id})
       mapped by ${map.creator} ▸ ${global.round(
        map.difficulty.rating,
        0.01
      )} stars
       length: ${result} ▸ (${map.bpm}bpm)
       accuracy: ${determineAcc(
         map.mode,
         score.counts
       )} ▸ map.rankedStatus ▸ (${score.rank})
       score: ${score.score} ▸ ${pp.toString() || "unknown pp value"}
       ${score.maxCombo}x ▸ [${score.counts["300"]}/${score.counts["100"]}/${
        score.counts["50"]
      }/${score.counts["miss"]}]
       mods: [${score.mods}]`
    }
  });
}

function determineAcc(type, counts, round = true) {
  switch (type) {
    case "Standard":
      return round
        ? roundAcc(
            standardAcc(
              counts["300"],
              counts["100"],
              counts["50"],
              counts["miss"]
            )
          )
        : standardAcc(
            counts["300"],
            counts["100"],
            counts["50"],
            counts["miss"]
          );
    case "Ctb":
    case "Mania":
    case "Taiko":
    default:
      return 0;
  }
}

function standardAcc(count300, count100, count50, countmiss) {
  //console.log("cm",countmiss,"c5",count50,50*count50,"c1",count100,100*count100,"c3",count300,300*count300,"ct",(countmiss + count50 + count100 + count300),((countmiss + count50 + count100 + count300)*300))
  let accN =
    50 * parseInt(count50) +
    100 * parseInt(count100) +
    300 * parseInt(count300);
  let accD =
    (parseInt(countmiss) +
      parseInt(count50) +
      parseInt(count100) +
      parseInt(count300)) *
    300;
  let finalAcc = accN / accD * 100;
  //console.log("acd",accD,"acn",accN,"fac",finalAcc);
  return finalAcc;
}
function roundAcc(acc) {
  return Math.round(acc * 100) / 100;
}
let func = async function(m, e, u) {
  if (m.bot) return;
  if (listening[m.id] && listening[m.id].id) {
    if (u == listening[m.id].id) {
      let scores = listening[m.id].scores;
      if (e.name == "⬅") {
        let tn = listening[m.id].currentMap;
        if (tn - 1 == -1) {
          tn = scores.length - 1;
        } else {
          tn--;
        }
        listening[m.id].currentMap = tn;
      }
      if (e.name == "➡") {
        let tn = listening[m.id].currentMap;
        if (tn + 1 == scores.length) {
          tn = 0;
        } else {
          tn++;
        }
        listening[m.id].currentMap = tn;
      }
      if (e.name == "🇽") {
        delete listening[m.id];
        m.delete();
        return;
      }
      let user = listening[m.id].user;
      let num = listening[m.id].currentMap;
      //console.log(scores[num]);
      let mapL = await osuapi.getBeatmaps({
        b: scores[num].beatmapId
      });
      let map = mapL[0];
      m.edit({
        embed: {
          title: `${user.name} (userid: ${user.id})`,
          thumbnail: {
            url: `https://b.ppy.sh/thumb/${map.beatmapSetId}.jpg`
          },
          color: 16738740,
          description: `[${map.title} by ${map.artist} [${
            map.version
          }]](https://osu.ppy.sh/beatmapsets/${map.beatmapSetId}/#osu/${
            map.id
          })\n mapped by ${map.creator}\n${global.round(
            map.difficulty.rating,
            0.01
          )} stars\n(${num + 1} of ${scores.length})`,
          fields: [
            {
              name: "Rank",
              value: `#${user.pp.rank}`,
              inline: true
            },
            {
              name: "Country Rank",
              value: `#${user.pp.countryRank}`,
              inline: true
            },
            {
              name: "PP",
              value: scores[num].pp ? scores[num].pp : user.pp.raw,
              inline: true
            },
            {
              name: "Level",
              value: `${global.round(user.level, 1)} (${global.round(
                user.level - global.round(user.level, 1),
                0.0001
              ) * 100}%)`,
              inline: true
            },
            {
              name: "Score",
              value: scores[num].score,
              inline: true
            },
            {
              name: "Max Combo",
              value: `${scores[num].maxCombo} of ${map.maxCombo}`,
              inline: true
            },
            {
              name: "300s Hit",
              value: scores[num].counts["300"],
              inline: true
            },
            {
              name: "Misses",
              value: scores[num].counts.miss,
              inline: true
            },
            {
              name: "Mods",
              value: "[" + scores[num].mods + "]",
              inline: true
            },
            {
              name: "Rank",
              value: scores[num].rank,
              inline: true
            }
          ]
        }
      });
    }
  }
};
