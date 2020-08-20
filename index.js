const Discord = require('discord.js'); //hello there yes 
const bot = new Discord.Client();
const prefix = "g";
const status = "10";


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


const token = 'NjcxMTU2MTMwNDgzMDExNjA1.Xs9tTw.QOJZky89ROAnBWYiu1l9EDhk8q4';



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
	
	if (message.content === 'ghelp') {
		message.channel.send('yes');
	} else if (message.content === 'Hello there') {
		message.channel.send('General Kenobi');
		
	} else if (message.content === 'hello there') {
		message.channel.send('General Kenobi');
		
	} else if (message.content === 'HELLO THERE') {
		message.channel.send('General Kenobi');
	//testing commands
	} else if (command === `gt-detectiontest`) {
	// grab the "first" mentioned user from the message
	// this will return a `User` object, just like `message.author`
		const taggedUser = message.mentions.users.first();

		message.channel.send('User detected: ' + taggedUser);
		
	} else if (message.content === 'gt-servertest') {
		message.channel.send(`This server's name is: ${message.guild.name}`);
	}

});



//invite tracking



