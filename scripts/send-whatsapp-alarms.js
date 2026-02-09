const { Sequelize, DataTypes } = require('sequelize');
const twilio = require('twilio');
const dotenv = require('dotenv');

dotenv.config();

// Conectar a base de datos
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/logistics', {
    dialect: 'postgres',
    logging: false
});

// Definir modelo Order (copiado del backend)
const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    contract_no: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    requisition_no: {
        type: DataTypes.STRING,
    },
    description: {
        type: DataTypes.TEXT,
    },
    due_date: {
        type: DataTypes.DATEONLY,
    },
    status: {
        type: DataTypes.STRING,
    },
    provider: {
        type: DataTypes.STRING,
    },
    amount: {
        type: DataTypes.DECIMAL(15, 2),
    },
    institution: {
        type: DataTypes.STRING,
    },
    unit_price: {
        type: DataTypes.DECIMAL(15, 2),
    },
    delay_days: {
        type: DataTypes.INTEGER,
    },
    state: {
        type: DataTypes.STRING,
    },
    quantity: {
        type: DataTypes.DECIMAL(15, 2),
    },
    delivery_end_date: {
        type: DataTypes.DATEONLY,
    },
}, {
    tableName: 'Orders',
    timestamps: true
});

async function sendDailyAlarms() {
    try {
        console.log('🔄 Iniciando envío de alarmas...');

        // Conectar a DB
        await sequelize.authenticate();
        console.log('✅ Conectado a base de datos');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Órdenes VENCIDAS (más de 5 días de atraso)
        const fiveDaysAgo = new Date(today);
        fiveDaysAgo.setDate(today.getDate() - 5);

        const overdueOrders = await Order.findAll({
            where: {
                due_date: { [Sequelize.Op.lt]: fiveDaysAgo },
                status: { [Sequelize.Op.ne]: 'ENTREGADO' }
            }
        });

        // 2. Órdenes PRÓXIMAS A VENCER (15-30 días)
        const fifteenDays = new Date(today);
        fifteenDays.setDate(today.getDate() + 15);
        const thirtyDays = new Date(today);
        thirtyDays.setDate(today.getDate() + 30);

        const upcomingOrders = await Order.findAll({
            where: {
                due_date: {
                    [Sequelize.Op.between]: [fifteenDays, thirtyDays]
                },
                status: { [Sequelize.Op.ne]: 'ENTREGADO' }
            }
        });

        console.log(`📊 Órdenes vencidas: ${overdueOrders.length}`);
        console.log(`⚠️ Órdenes próximas a vencer: ${upcomingOrders.length}`);

        // Construir mensaje
        let message = `*🚨 REPORTE DIARIO - LOGÍSTICA ÉLITE*\\n`;
        message += `📅 ${today.toLocaleDateString('es-PA', { dateStyle: 'full' })}\\n\\n`;
        message += `----------------------------\\n`;
        message += `🔴 *VENCIDOS:* ${overdueOrders.length} contratos\\n`;
        message += `⚠️ *PRÓXIMOS A VENCER:* ${upcomingOrders.length} contratos\\n`;
        message += `----------------------------\\n\\n`;

        // Top 5 vencidos
        if (overdueOrders.length > 0) {
            message += `*TOP 5 MÁS URGENTES:*\\n\\n`;
            overdueOrders.slice(0, 5).forEach((o, idx) => {
                const dueDate = new Date(o.due_date);
                const daysOverdue = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
                message += `${idx + 1}. 📌 *${o.contract_no}*\\n`;
                message += `   🏢 ${o.provider}\\n`;
                message += `   ⏰ Vencido hace *${daysOverdue} días*\\n`;
                message += `   💰 ${formatCurrency(o.amount)}\\n\\n`;
            });
        }

        // Resumen próximos a vencer
        if (upcomingOrders.length > 0) {
            message += `\\n*PRÓXIMOS A VENCER (15-30 días):*\\n`;
            message += `Se detectaron ${upcomingOrders.length} contratos que vencerán pronto.\\n`;
        }

        message += `\\n----------------------------\\n`;
        message += `_Generado automáticamente por GitHub Actions_\\n`;
        message += `_Sistema de Logística Élite_`;

        // Enviar WhatsApp usando Twilio
        const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
        const phoneNumbers = process.env.ALARM_PHONE_NUMBERS.split(',');

        for (const phone of phoneNumbers) {
            const cleanPhone = phone.trim();
            if (!cleanPhone) continue;

            await client.messages.create({
                from: process.env.TWILIO_WHATSAPP_NUMBER,
                to: `whatsapp:${cleanPhone}`,
                body: message.replace(/\\n/g, '\n')
            });

            console.log(`✅ Alarma enviada a ${cleanPhone}`);
        }

        console.log('🎉 Todas las alarmas enviadas exitosamente');

    } catch (error) {
        console.error('❌ Error enviando alarmas:', error.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

function formatCurrency(val) {
    if (!val) return '-';
    return '$' + new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(val);
}

// Ejecutar
sendDailyAlarms();
