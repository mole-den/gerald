const Discord = require('discord.js'); //hello there yes 
const bot = new Discord.Client();
const commandPrefix = "g";
const status = "10";

/*bot.on('ready', () => {
    bot.user.setStatus('available') // Can be 'available', 'idle', 'dnd', or 'invisible'
    bot.user.setPresence({
        game: {
            name: 'Protection Status: ' + status + '% - Testing', 
            type: 2
        }
    });
});   */


const token = 'NjcxMTU2MTMwNDgzMDExNjA1.Xs9tTw.QOJZky89ROAnBWYiu1l9EDhk8q4';

/*bot.on('ready', () =>{
    console.log('Preparing to take over the world...');
    console.log('World domination complete.');
    console.log('ONLINE');
    //console.log(`Logged in as ${client.user.tag}!`);
});  */




bot.login(token);
