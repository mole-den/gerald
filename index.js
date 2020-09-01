const Discord = require('discord.js'); //hello there yes 
const bot = new Discord.Client();
const prefix = "g";


const slade = "sponge";
const zac = "idiot";
const rishaan = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const gerald = "me";
const darkdash = "uwu";


/*bot.on('ready', () => {
    bot.user.setStatus('available')
    bot.user.setPresence({
        game: {
            name: 'Firewall: ' + status + '%',
            type: "STREAMING",
            url: "https://discord.com/invite/Y2EtATM"
        }
    });
}); */


const token = 'NjcxMTU2MTMwNDgzMDExNjA1.Xs9tTw.QOJZky89ROAnBWYiu1l9EDhk8q4'; //the ancient texts!



bot.on('ready', () =>{
    console.log('Preparing to take over the world...');
    console.log('World domination complete.');
    console.log('ONLINE');
    //console.log(`Logged in as ${client.user.tag}!`);
});  


bot.login(token);



bot.on('guildMemberAdd', member => {
  // Send the message to a designated channel on a server:
  const channel = member.guild.channels.cache.find(ch => ch.name === 'joining-room');
  // Do nothing if the channel wasn't found on this server
  if (!channel) return;
  // Send the message, mentioning the member
  channel.send(`Welcome to the server, ${member}. Remember to follow the rules and praise me every Wednesday.`);
  console.log(`${member} added to database.`);
});

bot.on('message', message => {
	if (!message.content.startsWith(prefix) || message.author.bot) return;
	
	const args = message.content.slice(prefix.length).trim().split(' ');
	const command = args.shift().toLowerCase();
	
	if (command === 'ghelp') {
		message.channel.send('Hello there! I am Gerald: A discord bot made to protect your guild from raids and other attacks. Remeber to make a channel named #geraldlog and make your joining channel called #joining-room');
	} else if (message.content === 'Hello there') {
		message.channel.send('General Kenobi');
		
	} else if (message.content === 'hello there') {
		message.channel.send('General Kenobi');
		
	} else if (message.content === 'HELLO THERE') {
		message.channel.send('General Kenobi');
	//testing commands
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
	} else if (message.content === 'cc x pf?') {
		message.channel.send('yes');
		
		
		
	} else if (command === `labyrinth`) {
		if (message.guild.id !== '576344535622483968') return message.reply('This command is Project Flicker exclusive lol');
		
		message.channel.send('Creating Labyrinth...');
		
		const guild = msg.channel.guild;
		const labyrID = Math.random() * (1 - 100) + 1;
		
		guild.channels.create("labyrinth-" + labyrID)
  		.then(channel => {
    		let category = server.channels.cache.find(c => c.name == "Labyrinth" && c.type == "category");

    		if (!category) throw new Error("lol it no work nerd");
    		channel.setParent(category.id);
 		}).catch(console.error);
		
		message.channel.send('it werk?');
		
	}
	
});
	
