const Discord = require('discord.js'); //hello there yes 
const bot = new Discord.Client();
const commandPrefix = "g";
const status = "10";

bot.on('ready', () => {
    bot.user.setStatus('available')
    bot.user.setPresence({
        game: {
            name: 'Project Flicker',
            type: "STREAMING",
            url: "https://discord.com/invite/Y2EtATM"
        }
    });
});


const token = 'NjcxMTU2MTMwNDgzMDExNjA1.Xs9tTw.QOJZky89ROAnBWYiu1l9EDhk8q4';

bot.on('ready', () =>{
    console.log('Preparing to take over the world...');
    console.log('World domination complete.');
    console.log('ONLINE');
    //console.log(`Logged in as ${client.user.tag}!`);
});  




bot.login(token);
