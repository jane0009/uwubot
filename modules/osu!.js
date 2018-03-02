let nodesu = require("nodesu");
let path = require("path");
let osuapi = new nodesu.Client(global.janebot.keys.osu);
let listening = {};
let tracking = {};
let dataFolder = path.join(__dirname, "modules");
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
        let user = await osuapi.user.get(
          name,
          nodesu.Mode.all,
          1,
          nodesu.LookupType.string
        );
        if (!user) {
          msg.channel.createMessage("could not find a user by that name...");
          return;
        }
        //console.log(user);
        let userScores = isStats
          ? []
          : await osuapi.user.getRecent(
              name,
              nodesu.Mode.all,
              cnum,
              nodesu.LookupType.string
            );
        if (!userScores[0]) {
          msg.channel.createMessage({
            embed: {
              title: `${user.username} (userid: ${user.user_id})`,
              thumbnail: {
                url: `https://a.ppy.sh/${user.user_id}`
              },
              color: 16738740,
              //description: `${isStats ? "" : "**could not find recent scores for this user**"}`,
              fields: [
                {
                  name: "Rank",
                  value: `#${user.pp_rank}`,
                  inline: true
                },
                {
                  name: "Country Rank",
                  value: `#${user.pp_country_rank}`,
                  inline: true
                },
                {
                  name: "PP",
                  value: user.pp_raw,
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
                  value: user.playcount,
                  inline: true
                },
                {
                  name: "Accuracy",
                  value: `${global.round(user.accuracy)}%`,
                  inline: true
                },
                {
                  name: "Ranked Score",
                  value: user.ranked_score,
                  inline: true
                },
                {
                  name: "Total Score",
                  value: user.total_score,
                  inline: true
                },
                {
                  name: "Maps with 'SS'",
                  value: user.count_rank_ss,
                  inline: true
                },
                {
                  name: "Maps with 'S'",
                  value: user.count_rank_s,
                  inline: true
                },
                {
                  name: "Maps with 'A'",
                  value: user.count_rank_a,
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
        let mapL = await osuapi.beatmaps.getByBeatmapId(scores[num].beatmap_id);
        let map = mapL[0];
        let m = await msg.channel.createMessage({
          embed: {
            title: `${user.username} (userid: ${user.user_id})`,
            thumbnail: {
              url: `https://b.ppy.sh/thumb/${map.beatmapset_id}.jpg`
            },
            color: 16738740,
            description: `use \`osu <user> stats\` to get player stats\n[${
              map.title
            } by ${map.artist} [${
              map.version
            }]](https://osu.ppy.sh/beatmapsets/${map.beatmapset_id}/#osu/${
              map.beatmap_id
            })\n mapped by ${map.creator}\n${global.round(
              map.difficultyrating,
              0.01
            )} stars\n(${num + 1} of ${scores.length})`,
            fields: [
              {
                name: "Rank",
                value: `#${user.pp_rank}`,
                inline: true
              },
              {
                name: "Country Rank",
                value: `#${user.pp_country_rank}`,
                inline: true
              },
              {
                name: "PP",
                value: user.pp_raw,
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
                value: `${scores[num].maxcombo} of ${map.max_combo}`,
                inline: true
              },
              {
                name: "300s Hit",
                value: scores[num].count300,
                inline: true
              },
              {
                name: "Misses",
                value: scores[num].countmiss,
                inline: true
              },
              {
                name: "Mods",
                value: scores[num].enabled_mods,
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
            let user = await osuapi.user.get(
              name,
              nodesu.Mode.all,
              1,
              nodesu.LookupType.string
            );
            let userScores = await osuapi.user.getRecent(
              name,
              nodesu.Mode.all,
              5,
              nodesu.LookupType.string
            );
            if (user) {
              console.log(user);
              console.log(userScores);
              if (tracking[msg.guild.id][msg.channel.id][name]) {
                msg.channel.createMessage(
                  "This user is already being tracked!"
                );
                return;
              }
              tracking[msg.guild.id][msg.channel.id][name] = {};
              tracking[msg.guild.id][msg.channel.id][name].user = user;
              tracking[msg.guild.id][msg.channel.id][name].latest = userScores;
              msg.channel.createMessage("Now tracking " + name);
            } else {
              msg.channel.createMessage(
                "A user named " + name + " does not exist."
              );
            }
            break;
          case "remove":
            msg.channel.createMessage("Removing tracking for " + name);
            delete tracking[msg.guild.id][msg.channel.id][name];
            break;
          default:
            msg.channel.createMessage(
              "```\nuse <track add to add a user\nuse <track remove to remove a user\n```"
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
      disabled: true,
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
        let name = tracking[guild][channel][user].name;
        let data = await osuapi.user.getRecent(
          name,
          nodesu.Mode.all,
          5,
          nodesu.LookupType.string
        );
        let newMapSet = [];
        if (!tracking[guild][channel][user].latest[0]) {
          newMapSet = data;
        } else {
          for (map in data) {
            let ts = data[map].date;
            let ots = tracking[guild][channel][user].latest[0].date;
            if (new Date(ts).getTime() > new Date(ots).getTime()) {
              newMapSet.push(data[map]);
            }
          }
        }
        for (nm in newMapSet) {
          pushLatest(newMapSet[nm]);
        }
        tracking[guild][channel][user].latest = newMapSet;
      }
    }
  }
};
function pushLatest(map) {
  console.log("\n\n\n\n\n");
  console.log(map);
  msg.channel.createMessage("debug.. " + map.beatmap_id + " sc " + map.score);
}
function standardAcc(
  count300,
  count100,
  count50,
  countmiss,
  countkatu,
  countgeki
) {
  let accN = 50 * count50 + 100 * count100 + 300 * count300;
  let accD = (countmiss + count50 + count100 + count300) * 300;
  let finalAcc = accN / accD * 100;
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
      let mapL = await osuapi.beatmaps.getByBeatmapId(scores[num].beatmap_id);
      let map = mapL[0];
      m.edit({
        embed: {
          title: `${user.username} (userid: ${user.user_id})`,
          thumbnail: {
            url: `https://b.ppy.sh/thumb/${map.beatmapset_id}.jpg`
          },
          color: 16738740,
          description: `[${map.title} by ${map.artist} [${
            map.version
          }]](https://osu.ppy.sh/beatmapsets/${map.beatmapset_id}/#osu/${
            map.beatmap_id
          })\n mapped by ${map.creator}\n${global.round(
            map.difficultyrating,
            0.01
          )} stars\n(${num + 1} of ${scores.length})`,
          fields: [
            {
              name: "Rank",
              value: `#${user.pp_rank}`,
              inline: true
            },
            {
              name: "Country Rank",
              value: `#${user.pp_country_rank}`,
              inline: true
            },
            {
              name: "PP",
              value: user.pp_raw,
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
              value: `${scores[num].maxcombo} of ${map.max_combo}`,
              inline: true
            },
            {
              name: "300s Hit",
              value: scores[num].count300,
              inline: true
            },
            {
              name: "Misses",
              value: scores[num].countmiss,
              inline: true
            },
            {
              name: "Mods",
              value: scores[num].enabled_mods,
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
