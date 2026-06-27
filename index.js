/**
 * ╔══════════════════════════════════════════╗
 * ║         Void AFK Bot                     ║
 * ║         Developed by Void                ║
 * ║         All Rights Reserved © Void       ║
 * ╚══════════════════════════════════════════╝
 */

require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
} = require("discord.js");
const {
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
} = require("@discordjs/voice");

const voidColor = 0x7c3aed;
const footer = "Void AFK Bot • All Rights Reserved © Void";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// تخزين الاتصالات
const connections = new Map();

client.once("ready", async () => {
  console.log(`✅ Void AFK Bot Online! — ${client.user.tag}`);

  client.user.setPresence({
    activities: [{ name: "🎙️ Void AFK | /join", type: 2 }],
    status: "online",
  });

  // رفع الأوامر
  const commands = [
    new SlashCommandBuilder()
      .setName("join")
      .setDescription("🎙️ يدخل الفوسي ويبقى 24/7"),
    new SlashCommandBuilder()
      .setName("leave")
      .setDescription("👋 يطلع من الفوسي"),
    new SlashCommandBuilder()
      .setName("status")
      .setDescription("📊 عرض حالة الاتصال"),
  ].map((c) => c.toJSON());

  const rest = new REST().setToken(process.env.DISCORD_TOKEN);
  try {
    if (process.env.DISCORD_GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(
          process.env.DISCORD_CLIENT_ID,
          process.env.DISCORD_GUILD_ID
        ),
        { body: commands }
      );
    } else {
      await rest.put(
        Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
        { body: commands }
      );
    }
    console.log("✅ تم رفع الأوامر!");
  } catch (err) {
    console.error("❌ خطأ في رفع الأوامر:", err.message);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  await interaction.deferReply();

  // ── /join ──
  if (interaction.commandName === "join") {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff0000)
            .setDescription("❌ لازم تكون في روم صوتي!")
            .setFooter({ text: footer }),
        ],
      });
    }

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: true,
      });

      // إعادة الاتصال لو انقطع
      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch {
          try {
            const ch = client.channels.cache.get(voiceChannel.id);
            if (ch) {
              joinVoiceChannel({
                channelId: ch.id,
                guildId: interaction.guildId,
                adapterCreator: interaction.guild.voiceAdapterCreator,
                selfDeaf: true,
                selfMute: true,
              });
              console.log("🔄 أعيد الاتصال تلقائياً");
            }
          } catch (e) {
            console.error("❌ فشل إعادة الاتصال:", e.message);
          }
        }
      });

      connections.set(interaction.guildId, {
        connection,
        channelId: voiceChannel.id,
        joinedAt: Date.now(),
      });

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(voidColor)
            .setTitle("🎙️ دخل الروم!")
            .setDescription(`تم الدخول لـ **${voiceChannel.name}** وسيبقى 24/7`)
            .addFields(
              { name: "🔇 الميكروفون", value: "مكتوم", inline: true },
              { name: "🔇 الصوت", value: "مكتوم", inline: true }
            )
            .setFooter({ text: footer }),
        ],
      });
    } catch (err) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff0000)
            .setDescription(`❌ خطأ: \`${err.message}\``)
            .setFooter({ text: footer }),
        ],
      });
    }
  }

  // ── /leave ──
  if (interaction.commandName === "leave") {
    const conn = connections.get(interaction.guildId);
    if (!conn) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff9900)
            .setDescription("⚠️ البوت مو في روم صوتي!")
            .setFooter({ text: footer }),
        ],
      });
    }

    conn.connection.destroy();
    connections.delete(interaction.guildId);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(voidColor)
          .setDescription("👋 طلع من الروم الصوتي!")
          .setFooter({ text: footer }),
      ],
    });
  }

  // ── /status ──
  if (interaction.commandName === "status") {
    const conn = connections.get(interaction.guildId);
    if (!conn) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff9900)
            .setDescription("⚠️ البوت مو متصل بأي روم!")
            .setFooter({ text: footer }),
        ],
      });
    }

    const ch = client.channels.cache.get(conn.channelId);
    const uptime = Date.now() - conn.joinedAt;
    const hours = Math.floor(uptime / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(voidColor)
          .setTitle("📊 حالة الاتصال")
          .addFields(
            { name: "📍 الروم", value: ch ? ch.name : "غير معروف", inline: true },
            { name: "⏱️ وقت الاتصال", value: `${hours}س ${minutes}د`, inline: true },
            { name: "📶 الحالة", value: "✅ متصل", inline: true }
          )
          .setFooter({ text: footer }),
      ],
    });
  }
});

// حماية من الكراش
process.on("unhandledRejection", (err) => console.error("[UnhandledRejection]", err));
process.on("uncaughtException", (err) => console.error("[UncaughtException]", err));

client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error("❌ فشل تسجيل الدخول:", err.message);
  process.exit(1);
});
