const Discord = require('discord.js'); //hello there yes
//const { Client } = require('unb-api');
const bot = new Discord.Client();
const prefix = "g";

const guildID = '576344535622483968';

const token = 'NjcxMTU2MTMwNDgzMDExNjA1.Xs9tTw.QOJZky89ROAnBWYiu1l9EDhk8q4'; //the ancient texts!
//monsters

//var examplemonster = [id:0, name:"nerd", health:10, damage:2]

//end monsters

//weapons
//var exampleitem = [id:0, name:"Example Sword", damage:1, rarity:"common/uncommon/rare/epic/legendary/ancient"]
//var basicsword = [id: 1, name:"Basic Sword", damage:2, rarity:"common"]

//end weapons
//stats

//var playerhp = 0
//var playeratk = 0

//end stats

//inv

//end inv



bot.on('ready', () =>{
    console.log('Preparing to take over the world...');
    console.log('World domination complete.');
    console.log('ONLINE');
    bot.user.setPresence({ activity: { name: "Project Flicker", type: "WATCHING" }, status: "dnd" }); //online or dnd
    bot.emit('heartbeated');
});  


bot.login(token);



bot.on('guildMemberAdd', member => {
  // Send the message to a designated channel on a server:
  const channel = member.guild.channels.cache.find(ch => ch.name === 'joining-room');
  // Do nothing if the channel wasn't found on this server
  if (!channel) return;
  // Send the message, mentioning the member
  channel.send(`Welcome to the server, ${member}. Remember to follow the rules and praise me every Wednesday.`);
  channel.send(`Remember, you are being watched ${member}.`);
  console.log(`${member} added to database.`);
});

bot.on('message', message => {
	console.log(`${message.author.tag} said: ${message.content}`);
	const userID = message.author;
	if (!message.content.startsWith(prefix) || message.author.bot) return;
	
	const args = message.content.slice(prefix.length).trim().split(' ');
	const command = args.shift().toLowerCase();
	
	if (command === 'ghelp') {
		message.channel.send('Hello there! I am Gerald: A discord bot made to protect your guild from raids and other attacks. Remeber to make a channel named #geraldlog and make your joining channel called #joining-room I also am used in Project Flicker to do lot smart.');
	} else if (command === `t-detectiontest`) {
	// grab the "first" mentioned user from the message
	// this will return a `User` object, just like `message.author`
		const taggedUser = message.mentions.users.first();

		message.channel.send(`User detected: ${taggedUser.username} User ID is: ` + taggedUser);
		
	} else if (command === `t-servertest`) {
		message.channel.send(`This server's name is: ${message.guild.name}`);
	} else if (command == `detect`) {
		
		const taggedUser = message.mentions.users.first();
		
		message.channel.send(`User: ` + taggedUser + ` found in ${message.guild.name}`);
	} else if (command === `labyrinth`) {
		message.react('🐉');
		
		if (message.guild.id !== '576344535622483968') return message.reply('This command is Project Flicker exclusive lol');
		
		message.channel.send('Creating Labyrinth...');
		
		const guild = message.channel.guild;
		const labyrID = Math.round(Math.random() * (1 - 100) + 1);
		const labyrplayer = message.author 
		//const channelID = guild.channels.cache.find(ch => ch.name === "labyrinth-" + labyrID);
		
		guild.channels.create("labyrinth-" + labyrID)
		.then(channel => {
    		let category = guild.channels.cache.find(c => c.id == "749883316223737906" && c.type == "category");
		if (!category) throw new Error("lol it no work nerd");
    		channel.setParent(category.id);
 		}).catch(console.error);
		//const channelID = id
		//message.channel.send(`Labyrinth created! <#${channelID}>`);
		message.channel.send(`Labyrinth created, ${labyrplayer}!`);
		
		
		 const Lchannel = guild.channels.cache.find(ch => ch.name === 'labyrinth-' + labyrID);
  		 if (!Lchannel) return;
		 message.channel.send('test');
			
	} /*else if (command === `gequip`) {
		if (!args.length) {
		return message.channel.send(`You didn't specify the item, ${message.author}!`);
		}
		else if (args[0] === '1') {

			var playerinv = [basicsword.id] 

			var playerhp = playerhp + basicsword.damage
			
			return message.channel.send('Basic Sword Equipped');
		}
	}*/
	
});

bot.on('message', message => {
	if(message.content.toLowerCase().includes('hello there')) {
		message.channel.send('General Kenobi');
		
	} else if (message.content === 'cc x pf?') {
		message.channel.send('yes');
	} else if (message.content.toLowerCase().includes('pog')) {
		message.channel.send('**M I L K  C A P S**');
	} else if (message.content.toLowerCase().includes('gerald')) {
		message.channel.send('**Whomst has awakened the ancient one**');
		console.log('E');
	}
});  
	

async function heartbeat() {
	console.log('Heartbeat sent.');
	await new Promise(r => setTimeout(r, 500));
	bot.emit('heartbeated');
}

setInterval(heartbeat, 5000);

bot.on('heartbeated', () =>{
	console.log(`Heartbeat recived. Logged in as ${bot.user.tag}`);
});
// this is death
