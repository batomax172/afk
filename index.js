const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const TOKEN = process.env.TOKEN;
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;
const GUILD_ID = process.env.GUILD_ID;

client.once('ready', async () => {
  console.log(`✅ Bot is online: ${client.user.tag}`);

  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) {
    console.error('❌ Guild not found. Check your GUILD_ID.');
    return;
  }

  const channel = guild.channels.cache.get(VOICE_CHANNEL_ID);
  if (!channel) {
    console.error('❌ Voice channel not found. Check your VOICE_CHANNEL_ID.');
    return;
  }

  joinVoice(guild, channel);
});

function joinVoice(guild, channel) {
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: false,
    selfMute: true,
  });

  connection.on('stateChange', (oldState, newState) => {
    console.log(`Voice state: ${oldState.status} → ${newState.status}`);

    if (newState.status === 'disconnected') {
      console.log('⚠️  Disconnected. Reconnecting in 5 seconds...');
      setTimeout(() => joinVoice(guild, channel), 5000);
    }
  });

  console.log(`🔊 Joined voice channel: ${channel.name}`);
}

client.on('voiceStateUpdate', (oldState, newState) => {
  const connection = getVoiceConnection(oldState.guild.id);
  if (!connection && oldState.channelId === VOICE_CHANNEL_ID) {
    const guild = oldState.guild;
    const channel = guild.channels.cache.get(VOICE_CHANNEL_ID);
    if (channel) joinVoice(guild, channel);
  }
});

client.login(TOKEN);
