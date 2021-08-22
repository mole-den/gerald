const Discord = require('discord.js'); //hello there yes
//const { Client } = require('unb-api');
const bot = new Discord.Client();
const prefix = "g";

//const Chatbot  =  require("discord-chatbot");
//var doheartbeat = true

//const guildID = '576344535622483968';

const token = 'NjcxMTU2MTMwNDgzMDExNjA1.Xs9tTw.QOJZky89ROAnBWYiu1l9EDhk8q4'; //the ancient texts!

//const chatbot  =  new  Chatbot({name: "Gerald", gender: "Male"});


//chatbot.chat("Hello").then(console.log).catch(e => console.log(e));
/*
	Hi, my friend! Do you want me to tell you a story?
 */

//const logs = guild.channels.cache.find(ch => ch.name === 'gerldlog');

/*
Hello! I am Gerald. Praise me or nerd. I am a flightless bird in a suit with a fedora and a cane. I am the 2nd coolest thing to exist. 1st is my creator obv.

I was originally intended to be a server protection bot. Now I am used for raids? I dont even know.
*/

//wip -> for new verification system


bot.on('ready', () =>{
    console.log('Preparing to take over the world...');
    console.log('World domination complete.');
    console.log('ONLINE');
    bot.user.setPresence({ activity: { name: "you.", type: "WATCHING" }, status: "dnd" }); //online or dnd
    //bot.emit('heartbeated');
});  


//bot.on('message', (message) => antiSpam.message(message)); 

bot.login(token);
//egg




bot.on('message', message => {
	
	
	if (message.channel.type === 'dm') return;
	const channel = message.guild.channels.cache.find(ch => ch.name === 'gerald');

	
	console.log(`${message.author.tag} said: "${message.content}" in ${message.guild.name}`);
	if (!channel) return;
	if (message.channel.name === 'gerald') return;
	channel.send(`**${message.author.tag}** said: \`${message.content}\` in ${message.guild.name}`);
});

	
	
bot.on('message', message => {	
	
	const userID = message.author;
	if (!message.content.startsWith(prefix) || message.author.bot) return;
	
	const args = message.content.slice(prefix.length).trim().split(' ');
	const command = args.shift().toLowerCase();
	
	if (command === `help`) {
		message.channel.send('Hello! I am Gerald. I will enable you to take control of your server by my rules >:) (invite link coming soonish)');
	} else if (command === `detect`) {
	// grab the "first" mentioned user from the message
	// this will return a `User` object, just like `message.author`
		const taggedUser = message.mentions.users.first();

		message.channel.send(`User detected: ${taggedUser.username} User ID is: ` + taggedUser);
		
	} else if (command === `t-servertest`) {
		message.channel.send(`This server's name is: ${message.guild.name}`);
	} else if (command === `setup`) {
		message.channel.send(`Beginning setup but no because zac cant code`);
  			if (err) return console.log(err);
  			console.log(`L`);
		
		
		//im a gnome
		
		
	} else if (command === `die`) {
		message.channel.send(`no u`);
	} else if (command === `cool`) {
		message.channel.send(`You are not as cool as me.`)
	} else if (command === `buy egg`) {
		message.channel.send(`egg`)
	}
	
	
	
	
});


bot.on('message', message => {
	if(message.content.toLowerCase().includes('hello there')) {
		message.channel.send('General Kenobi!');
	} else if(message.content.toLowerCase().includes('fuck')) {
		message.channel.send('oi watch yo language');
	} else if(message.content.toLowerCase().includes('shit')) {
		message.channel.send('oi watch yo language');
	} else if(message.content.toLowerCase().includes('cock')) {
		message.channel.send('oi watch yo language');
	} else if(message.content.toLowerCase().includes('cum')) {
		message.channel.send('oi watch yo language');
	} else if(message.content.toLowerCase().includes('ass')) {
		message.channel.send('oi watch yo language');
	} else if(message.content.toLowerCase().includes('bitch')) {
		message.channel.send('oi watch yo language');
		
	} else if(message.content.toLowerCase().includes('owo')) {
		message.channel.send('stfu');
		
	} else if(message.content.toLowerCase().includes('zac')) {
		message.channel.send('ew i hate that guy');
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
	
bot.on('heartbeated', () =>{
	//console.log(`Heartbeat recived. Logged in as ${bot.user.tag}`);
});

// the spanish inquisition
// do u want a banana
