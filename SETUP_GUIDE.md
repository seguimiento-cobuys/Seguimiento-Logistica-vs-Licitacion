# 🚀 Guía de Configuración - Automatización Completa

## Paso 1: Configurar PM2 (Servicio en Segundo Plano)

### ¿Qué hace?
PM2 convierte tu aplicación en un servicio que:
- ✅ Corre siempre en segundo plano
- ✅ Se inicia automáticamente con Windows
- ✅ Ya NO necesitas abrir `debug_launcher.bat`

### Instalación

1. **Ejecuta `setup_service.bat`** (como Administrador):
   ```bash
   # Click derecho → Ejecutar como administrador
   setup_service.bat
   ```

2. **Comandos útiles de PM2:**
   ```bash
   pm2 status          # Ver estado de servicios
   pm2 logs            # Ver logs en tiempo real
   pm2 restart all     # Reiniciar servicios
   pm2 stop all        # Detener servicios
   pm2 delete all      # Eliminar servicios
   ```

3. **Verificar que funciona:**
   - Abre http://localhost:5173 (Frontend)
   - Abre http://localhost:5000 (Backend API)

---

## Paso 2: Configurar SharePoint (Sincronización Automática)

### Requisitos
- Cuenta Microsoft 365 / Office 365
- Permisos de administrador en Azure AD

### Pasos

#### 2.1 Crear App Registration en Azure

1. Ve a [Azure Portal](https://portal.azure.com)
2. **Azure Active Directory** → **App registrations** → **New registration**
3. Configuración:
   - **Name**: Logistics Tracker Sync
   - **Supported account types**: Single tenant
   - **Redirect URI**: `http://localhost:5000/auth/callback`
4. Click **Register**

#### 2.2 Copiar Credentials

1. En la página de la app, copia:
   - **Application (client) ID**
   - **Directory (tenant) ID**

2. Ve a **Certificates & secrets** → **New client secret**
   - Description: "Logistics App Secret"
   - Expires: 24 months
   - Click **Add**
   - **⚠️ COPIA EL VALOR INMEDIATAMENTE** (solo se muestra una vez)

#### 2.3 Configurar Permisos

1. Ve a **API permissions** → **Add a permission**
2. Selecciona **Microsoft Graph** → **Application permissions**
3. Agrega estos permisos:
   - `Sites.Read.All`
   - `Files.Read.All`
4. Click **Grant admin consent** (botón azul)

#### 2.4 Obtener SharePoint Site URL

1. Ve a tu sitio de SharePoint donde está el archivo Excel
2. Copia la URL (ejemplo: `https://contoso.sharepoint.com/sites/Logistica`)
3. Necesitas obtener el Site ID ejecutando este comando en PowerShell:

```powershell
# Instalar módulo (solo una vez)
Install-Module -Name PnP.PowerShell

# Conectar a SharePoint
Connect-PnPOnline -Url "https://tuempresa.sharepoint.com/sites/Logistica" -Interactive

# Obtener Site ID
Get-PnPSite | Select Id

# El formato será: domain.sharepoint.com,abc-123,def-456
```

#### 2.5 Actualizar archivo `.env`

Edita `backend/.env` y agrega:

```bash
# Azure AD Credentials
AZURE_TENANT_ID=tu-tenant-id-aqui
AZURE_CLIENT_ID=tu-client-id-aqui
AZURE_CLIENT_SECRET=tu-client-secret-aqui

# SharePoint Configuration
SHAREPOINT_SITE_URL=tuempresa.sharepoint.com,site-id,web-id
SHAREPOINT_FILE_PATH=Documentos Compartidos/Logistica/datos.xlsx
```

#### 2.6 Instalar Dependencias y Probar

```bash
cd backend
npm install
pm2 restart all
pm2 logs logistics-backend
```

---

## Paso 3: Configurar GitHub Actions (Alarmas Automáticas)

### 3.1 Crear Repositorio en GitHub

1. Ve a [GitHub.com](https://github.com) y crea un nuevo repositorio:
   - Name: `logistics-tracker`
   - Visibility: **Private** (recomendado)

2. Sube tu código:
```bash
cd "c:/Users/Karla Lopez/Tagore Dropbox/Karla Lopez/Desktop/Nuevo archivo de inversionistas/Seguimiento Logistica vs Licitacion"

git init
git add .
git commit -m "Initial commit - Logistics Tracker"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/logistics-tracker.git
git push -u origin main
```

### 3.2 Configurar Secrets en GitHub

1. Ve a tu repositorio en GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** para cada uno:

| Secret Name | Valor |
|------------|-------|
| `DATABASE_URL` | `postgres://usuario:password@host:5432/logistics` |
| `TWILIO_SID` | Tu Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Tu Twilio Auth Token |
| `TWILIO_WHATSAPP_NUMBER` | `whatsapp:+507XXXXXXXX` |
| `ALARM_PHONE_NUMBERS` | `50766778899,50733445566` (separados por coma) |

### 3.3 Probar GitHub Actions

1. Ve a **Actions** en tu repositorio
2. Selecciona **Enviar Alarmas WhatsApp Diarias**
3. Click **Run workflow** → **Run workflow**
4. Verifica los logs

### 3.4 Horario de Ejecución

Por defecto, las alarmas se envían a las **8:00 AM hora de Panamá**.

Para cambiar el horario, edita `.github/workflows/send-alarms.yml`:

```yaml
schedule:
  # Formato: minuto hora * * *
  - cron: '0 13 * * *'  # 8 AM Panamá (UTC-5 = 13:00 UTC)
  # Para 9 AM: '0 14 * * *'
  # Para 7 AM: '0 12 * * *'
```

---

## Resumen: ¿Qué tengo ahora?

✅ **PM2 Service**: App corre siempre en segundo plano
✅ **SharePoint Sync**: Sincroniza Excel automáticamente cada 30 min
✅ **GitHub Actions**: Envía alarmas WhatsApp todos los días a las 8 AM

---

## Comandos de Mantenimiento

### Ver servicios activos
```bash
pm2 status
```

### Ver logs en tiempo real
```bash
pm2 logs
pm2 logs logistics-backend
pm2 logs logistics-frontend
```

### Reiniciar después de cambios
```bash
pm2 restart all
```

### Detener temporalmente
```bash
pm2 stop all
```

### Eliminar servicios
```bash
pm2 delete all
pm2 save
```

---

## Troubleshooting

### ❌ "PM2 no encontrado"
```bash
npm install -g pm2
npm install -g pm2-windows-startup
```

### ❌ SharePoint no sincroniza
1. Verifica credenciales en `.env`
2. Verifica permisos en Azure AD
3. Revisa logs: `pm2 logs logistics-backend`

### ❌ GitHub Actions falla
1. Verifica que todos los **Secrets** estén configurados
2. Verifica que `DATABASE_URL` apunte a una base de datos accesible desde internet
   - Considera usar **Railway**, **Neon**, o **Supabase** (gratis)

---

## Próximos Pasos

1. **Ejecuta `setup_service.bat`** para configurar PM2
2. **Configura Azure AD** y actualiza `.env` con credenciales de SharePoint
3. **Sube a GitHub** y configura los Secrets
4. **¡Listo!** Tu sistema está 100% automatizado
