import * as discord from "discord.js";
import * as pg from 'pg';
import fs from 'fs';
fs;

process.on('uncaughtException', async error => {
	console.log(error);
	console.log('err');
	let x= await (await bot.guilds.fetch('809675885330432051')).channels.fetch('809675885849739296') as discord.TextChannel
	await x.send(`<@471907923056918528>, <@811413512743813181>\n FATAL:\n ${error}\n Exiting process`)
	process.exit()
});

const myIntents = new discord.Intents();
myIntents.add(discord.Intents.FLAGS.GUILDS, discord.Intents.FLAGS.GUILD_MEMBERS, discord.Intents.FLAGS.GUILD_MESSAGES,
	discord.Intents.FLAGS.DIRECT_MESSAGES, discord.Intents.FLAGS.GUILD_BANS, discord.Intents.FLAGS.GUILD_MESSAGE_TYPING,
	discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS, discord.Intents.FLAGS.GUILD_PRESENCES
);
let dbConnected: boolean = false
const bot = new discord.Client({ intents: myIntents });
const logmessages = false;
const prefix = "g";
//var doheartbeat = true
//const guildID = '576344535622483968';

const token: string = 'NjcxMTU2MTMwNDgzMDExNjA1.Xi402g.Qt5Ueo_U5m87MLtcnXnM_3xx0yo'; //the sacred texts!
const dbToken: string = `postgres://eswctjqvpzzbof:b4d93101ae7dcbaadcc4f72e791f5784b6001d2cbd17a8e7378939bd2feffc33@ec2-44-199-86-61.compute-1.amazonaws.com:5432/dfmuinj2u5v6db`;console.log(process.version);

bot.on('ready', () => {
	console.log('Preparing to take over the world...');
	console.log('World domination complete.');
	console.log('ONLINE');
	bot.user!.setPresence({ activities: [{ name: 'you', type: "WATCHING" }], status: 'dnd' });
	//online or dnd
	//bot.emit('heartbeated');
});

const db = new pg.Client({
	connectionString: dbToken,
	ssl: {
		rejectUnauthorized: false
	}
});
(async () => {
	await db.connect();
	dbConnected = true
})()

bot.login(token);
//egg

bot.on('guildMemberAdd' , (member) => {
	member;
	//db.query('INSERT INTO')
})


let lastChannel: discord.TextBasedChannels;
bot.on('message', (message: discord.Message) => {
	lastChannel = message.channel
	if (logmessages === false) return;
	if (message.channel.type === 'DM') return;
	const channel = message.guild!.channels.cache.find(ch => ch.name === 'gerald');


	console.log(`${message.author.tag} said: "${message.content}" in ${message.guild!.name}`);
	if (!channel) return;
	if (message.channel.name === 'gerald') return;
	if (channel.type === 'GUILD_TEXT') {
		(channel as discord.TextChannel).send(`**${message.author.tag}** said: \`${message.content}\` in ${message.guild!.name}`);
	}
});



bot.on('message', async (message: discord.Message) => {
	try {
		const userID = message.author;
		userID;
		if (!message.content.startsWith(prefix) || message.author.bot) return;

		const args = message.content.slice(prefix.length).trim().split(' ');
		const command = args.shift()?.toLowerCase();

		if (command === `help`) {
			message.channel.send('Hello! I am Gerald. I will enable you to take control of your server by my rules >:)');
		} else if (command === `detect`) {
			// grab the "first" mentioned user from the message
			// this will return a `User` object, just like `message.author`
			const taggedUser = message.mentions.users.first();
			if (taggedUser) {
				message.channel.send(`User detected: ${taggedUser.username} User ID is: ` + taggedUser);
			}

		} else if (command === `t-servertest`) {
			if (message.channel.type !== 'DM') {
				message.channel.send(`This server's name is: ${message.guild!.name}`);
			}
		} else if (command === `setup`) {
			message.channel.send(`Beginning setup but no because zac cant code`);
			//if (err) return console.log(err);
			console.log(`L`);

			//im a gnome
		} else if (command === `die`) {
			message.channel.send(`no u`);
		} else if (command === `politics`) {
			//message.channel.send(`Religon And Politics often make some people lose all perspective and give way to ranting and raving and carrying on like emotional children. They either refuse to discuss it with reason, or else they prefer argumentum ad hominum, which is a hell of a way to conduct a discussion. Well, anyhow, not long ago, I was talking about the elections, and how the campaigns were ignoring the issues, and sticking instead to invective and personal crap that had nothing to do with the substantive problems of running a government, which is all true, as you know if you followed the speeches and so-called debates of the candidates. Anyhow, one of the guys I was talking with said not a word in the whole conversation except at the end when he suddenly chuckled and said we were all full of shit, and why didn't we go live in Russia or China if that was the way we all hated the United States Of America. Next thing you know the whole blooming discussion was more like a brawl, And the epithets flew thick and fast, and the noise was incredible. Someone said "son of a bitch", and I think he said "bastard". I couldn't be sure, it was all so confusing. Well, anyhow, I was attempting to get it all back on a rational level. I tried, for example, to talk to the one who had started it all, and I asked him just what did he mean we were all full of shit. Was he making a statement of fact as he knew it, and where was his documentation to back up his claim? I think Socrates would've been proud of the way I refuted his argument. That is, I tried to refute it, but all he could offer by way of rebuttal was more of the same about how we were all full of shit. But he wouldn't say why, he just kept on repeating it, that and the part about Russia and China and communist dupes, and I'll have to confess that I got a bit angry and told him to stuff his ideas up his ass, which you don't have to tell me is hardly a way to convince anyone in an argument. Then he got salty and threatened to give me a punch in the mouth if I didn't shut up, and I really got hot, and the others did too, and we all beat the shit out of mister conservative. And, after all, he had only himself to be blamed. This is still a free country, And anyone telling a fellow like me, "Brother, you're full of shit", better be good and ready to answer politely when asked if he'd care to say why.`);
		} else if (command === `cool`) {
			message.channel.send(`You are not as cool as me.`);
		} else if (command === `invite`) {
			message.channel.send(`https://discord.com/oauth2/authorize?client_id=671156130483011605&scope=bot&permissions=8`);
		} else if (command === 'smite') {
			if (message.channel.type === 'DM') return;
			let author = await message.guild?.members.fetch(message.author)
			if (author && author.permissions.has(discord.Permissions.FLAGS.BAN_MEMBERS)) {
				if (args[0] && args[0] === "add") {
					let user = message.mentions.users?.first();
					db.query(`INSERT INTO users (userid) VALUES ($1)`, [BigInt(user?.id || args[1])]);
					db.query(`INSERT INTO gmember (guild, userid, blacklisted) VALUES ($1, $2, true) ON CONFLICT UPDATE`, [BigInt(message.guildId!), BigInt(user?.id || args[1])]);
				};
				let blist = await db.query("SELECT * FROM gmember WHERE guild=$1 AND blacklisted", [BigInt(message.guildId!)]);
				blist.rows.forEach(user => message.guild!.members.ban(user.userid, {
					reason: "Blacklisted by Gerald"
				}));
				message.channel.send('Smite thee with thunderbolts!');

			} else {
				message.channel.send('You do not have the required permissions')
			}
		} else if (command === 'uptime') {
			let totalSeconds = Math.round(process.uptime())
			let hours = Math.floor(totalSeconds / 3600);
			totalSeconds %= 3600;
			let minutes = Math.floor(totalSeconds / 60);
			let seconds = totalSeconds % 60;
			message.channel.send(`${hours} hours, ${minutes} mins, ${seconds} seconds`)
		} else if (command === 'query') {
			let str = message.content;
			let out = str.substring(str.indexOf('```') + 3, str.lastIndexOf('```'));
			if (message.author.id !== "471907923056918528" && message.author.id !== "811413512743813181") {
				message.channel.send('You do not have the required permissions');
				return;
			}
			if (dbConnected === true) {
				console.log(out)
				let data = await db.query(out)
				console.log('done')
				try {
					message.channel.send(`${data.command} completed - ${data.rowCount} rows, \n${JSON.stringify(data.rows)}`)
				} catch (error) {
					console.log("error");
					console.log(error);
					if (message.author.id == "471907923056918528" || message.author.id == "811413512743813181") {
						lastChannel.send(`Unhandled exception: \n ${error}`);
						return;
					}
					lastChannel.send(`<@471907923056918528>, <@811413512743813181>\n Unhandled exception: \n ${error}`);
				}
			} else {
				message.channel.send('Not connected to database')
			}
		} else if (command === "eval") {
			let str = message.content;
			let out = str.substring(str.indexOf('```') + 3, str.lastIndexOf('```'));
			// if (message.author.id !== "471907923056918528" && message.author.id !== "811413512743813181") {
			// 	message.channel.send('You do not have the required permissions.');
			// 	return;
			// }
			try {
				eval(out);
			} catch (error) {
				console.log("error");
				console.log(error);
				if (message.author.id == "471907923056918528" || message.author.id == "811413512743813181") {
					lastChannel.send(`Unhandled exception: \n ${error}`);
					return;
				}

				lastChannel.send(`<@471907923056918528>, <@811413512743813181>\n Unhandled exception: \n ${error}`);
			}
			message.channel.send('Completed \n');
		} else if (command === "db-setup") {
			if (message.author.id !== "471907923056918528" && message.author.id !== "811413512743813181") {
				message.channel.send('You do not have the required permissions.');
				return;
			}
			let users = await message.guild?.members.fetch()
			users?.forEach((i) => {
				db.query('INSERT INTO gmember (guild, userid) VALUES ($1, $2)', [BigInt(i.guild.id), BigInt(i.id)]);
			});
		}
	} catch (error) {
		console.log("error");
		console.log(error);
		if (message.author.id == "471907923056918528" || message.author.id == "811413512743813181") {
			lastChannel.send(`Unhandled exception: \n ${error}`);
			return;
		}
		lastChannel.send(`<@471907923056918528>, <@811413512743813181>\n Unhandled exception: \n ${error}`);
	}
});


async function heartbeat() {
	//console.log('Heartbeat sent.');
	await new Promise(r => setTimeout(r, 500));
	bot.emit('heartbeated');
}

//if doheartbeat = true {
setInterval(heartbeat, 5000);
//}

bot.on('heartbeated', () => {
	//console.log(`Heartbeat recived. Logged in as ${bot.user.tag}`);
});

