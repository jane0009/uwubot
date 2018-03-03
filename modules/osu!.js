let fs = require("fs");
let nodesu = require("nodesu");
let node_osu = require("node-osu");
let path = require("path");
let osuapi = new node_osu.Api(global.janebot.keys.osu);
let listening = {};
let tracking = {};
let dataFolder = path.join("/home/jane/uwubot", "data");
let cfg = require(path.join(dataFolder, "osutracking.json"));
tracking = cfg;
module.exports = {
  disabled: false,
  name: "osu!",
  commands: {
    recent: {
      desc: "gets last X plays for a user",
      perm: "all",
      func: async function(msg, args, data) {
        let c = args.split(" ");
        let name = c[0];
        let cnum = parseInt(c[1]) ? parseInt(c[1]) : 5;
        let isStats = false;
        if (c[1] == "stats") {
          isStats = true;
        }
        if (!name || cnum == undefined) {
          msg.channel.createMessage("not enough parameters...");
          return;
        }
        let user = await osuapi.getUser({
          u: name
        });
        if (!user) {
          msg.channel.createMessage("could not find a user by that name...");
          return;
        }
        //console.log(user);
        let userScores = isStats
          ? []
          : await osuapi.getUserRecent({
              u: name,
              limit: cnum
            });
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
        let c = args.split(" ");
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
            let userScores = await osuapi.getUserRecent({
              u: name,
              limit: cnum
            });
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
                JSON.stringify(tracking)
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
              JSON.stringify(tracking)
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
              "```\nuse <track add to add a user\nuse <track remove to remove a user\n<track [get|list] to list all tracked users\n```"
            );
        }
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
    example: {
      disabled: false,
      type: "interval",
      time: 60000,
      func: function() {
        queryApi();
      }
    }
  }
};
let queryApi = async function() {
  let newDat = tracking;
  for (guild in tracking) {
    for (channel in tracking[guild]) {
      for (user in tracking[guild][channel]) {
        //console.log(tracking[guild][channel]);
        let name = tracking[guild][channel][user].user.username;
        let data;
        try {
          data = await osuapi.getUserRecent({
            u: name,
            limit: 5
          });
        } catch (e) {
          console.log(name, e);
        }
        //console.log("dat", name, data);
        let newMapSet = [];
        if (!tracking[guild][channel][user].latest[0]) {
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
        //console.log("nms", newMapSet);
        for (nm in newMapSet) {
          if (newMapSet[nm].rank != "F") {
            pushLatest(guild, channel, newMapSet[nm], user);
          }
        }
        if (newMapSet && newMapSet[0]) {
          tracking[guild][channel][user].latest = newMapSet;
        }
      }
    }
  }
  fs.writeFileSync(
    path.join(dataFolder, "osutracking.json"),
    JSON.stringify(tracking)
  );
};
async function pushLatest(gid, cid, score, usern) {
  //console.log("\n\n\n\n\n");
  let user = await osuapi.getUser({
    u: name
  });
  let mapL = await osuapi.getBeatmaps({
    b: score.beatmapId
  });
  let map = mapL[0];
  /*let scores = await osuapi.scores.get(score.id, score.mods, 1, usern, nodesu.LookupType.string);
    console.log(scores);*/
  //console.log(user, usern);
  console.log("new score " + usern + " " + score.id, map);
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
  let chan = global.janebot.bot.guilds.get(gid).channels.get(cid);
  chan.createMessage({
    embed: {
      title: `new! for user ${user.name} (userid: ${user.id})`,
      thumbnail: {
        url: `https://b.ppy.sh/thumb/${map.beatmapSetId}.jpg`
      },
      color: 16738740,
      description: `[${map.title} by ${map.artist} [${
        map.version
      }]](https://osu.ppy.sh/beatmapsets/${map.beatmapSetId}/#osu/${map.id})
       mapped by ${map.creator}
       ${global.round(map.difficulty.rating, 0.01)} stars
      mods: [${score.mods}]
      accuracy: ${determineAcc(map.mode, score.counts)}`
    }
  });
  if (
    score.counts["300"] &&
    score.counts["100"] &&
    score.counts["50"] &&
    score.counts.miss
  ) {
    chan.createMessage(
      "PP: " +
        score.pp +
        " ACC: " +
        standardAcc(
          score.counts["300"],
          score.counts["100"],
          score.counts["50"],
          score.counts.miss
        ) +
        "%"
    );
  }
}

function determineAcc(type, counts) {
  switch (type) {
    case "Standard":
      return standardAcc(
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
  return Math.round(finalAcc * 100) / 100;
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
