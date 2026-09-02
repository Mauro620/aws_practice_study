# Guía Base: Arquitectura AWS, EC2 y Despliegue Estático

Esta guía centraliza los conceptos fundamentales de tu curso de AWS Cloud Architecture. Dominar esta arquitectura base (VPC, Security Groups, Balanceadores) es exactamente lo que te permitirá luego integrar de forma fluida herramientas más avanzadas como contenedores Docker o pipelines de CI/CD para la automatización de tus aplicaciones.

## 1. Virtual Private Cloud (VPC) y Subredes
La VPC es tu red privada virtual, un espacio aislado lógicamente dentro de la nube de AWS. Al crearla con subredes automáticas, por lo general se aprovisionan 2 subredes públicas y 2 privadas, distribuidas en diferentes Zonas de Disponibilidad (AZs) para garantizar resiliencia.
*   **Subredes Públicas:** Tienen una ruta directa hacia un Internet Gateway (IGW). Aquí es donde ubicamos recursos que deben ser accesibles desde fuera, como los Balanceadores de Carga o servidores web estáticos (cuando están expuestos directamente).
*   **Subredes Privadas:** No tienen acceso directo de entrada desde internet. Son el lugar seguro ideal para bases de datos, backends de aplicaciones o servicios internos.

## 2. EC2: Computación y Seguridad

### Instancias y Llaves (.pem)
Al levantar servidores virtuales (EC2), solemos usar Amazon Linux (actualmente basado en dnf, como Amazon Linux 2023) por su alta optimización y arranque rápido en el ecosistema de AWS. Es una excelente práctica mantener un solo par de claves (`.pem`) administrado por región para no saturar la gestión de credenciales, usándolas para autenticarte de forma segura desde tu entorno local.

### Profundización: Security Groups (Grupos de Seguridad)
Los Security Groups actúan como un firewall virtual "stateful" (con estado) a nivel de instancia. Controlan el tráfico entrante (Inbound) y saliente (Outbound) evaluando reglas específicas. Operan bajo el principio de "denegación por defecto": todo lo que no esté explícitamente permitido, está bloqueado.
*   **HTTP (Puerto 80) / TCP:** Permite el tráfico web estándar sin cifrar. Es estrictamente necesario para que los usuarios puedan resolver y ver tu archivo `index.html` a través de un navegador.
*   **SSH (Puerto 22) / TCP:** Permite la conexión remota segura a la terminal del servidor (Secure Shell). **Caso de uso crítico:** En un entorno real, jamás deberías dejar el puerto 22 abierto a todo internet (`0.0.0.0/0`). La práctica correcta es restringirlo a tu IP pública local o a la IP de una VPN, previniendo ataques de fuerza bruta.
*   **Otras reglas comunes a futuro:** 
    *   **HTTPS (Puerto 443):** Para tráfico web cifrado mediante certificados SSL/TLS.
    *   **Puertos de Bases de Datos (3306 MySQL, 5432 PostgreSQL, 27017 MongoDB):** Estos puertos se abren en las instancias ubicadas en subredes privadas, permitiendo tráfico *únicamente* desde el Security Group que tiene asignado tu servidor web o backend, aislando la base de datos de internet.

### Almacenamiento: Volúmenes y Snapshots
*   **Volúmenes (EBS):** Operan como el "disco duro" en red de tu instancia. Poseen un ciclo de vida propio; al configurar la EC2 puedes decidir si el volumen se destruye al eliminar la instancia o si persiste para no perder la información.
*   **Snapshots:** Son copias de seguridad (backups) incrementales de tu volumen EBS guardados en un momento específico en el tiempo. Son tu red de seguridad para recuperación ante desastres o la base para crear imágenes de máquina (AMIs) y clonar servidores.

### Profundización: Balanceadores de Carga y Target Groups
Estos dos componentes son el corazón de la Alta Disponibilidad (High Availability) y la escalabilidad. Trabajan de la mano para abstraer el tráfico de las instancias individuales.
*   **Target Group (Grupo de Destino):** Es una agrupación lógica de tus instancias EC2 (o contenedores). Su función va más allá de solo agrupar: se encarga de realizar **Health Checks** (comprobaciones de estado). Constantemente hace peticiones (ej. un ping al puerto 80) a tus instancias. Si una instancia se congela o apaga, el Target Group la marca como "Unhealthy" (Poco saludable).
*   **Load Balancer (ALB - Application Load Balancer):** Se ubica en las subredes públicas y actúa como el punto de entrada principal para tus usuarios. En lugar de que el usuario final conozca la IP de tu EC2, accede al DNS del balanceador. El balanceador toma ese tráfico entrante y lo distribuye de forma uniforme (algoritmo Round Robin, por defecto) entre las instancias de tu Target Group que estén marcadas como "Healthy". Si una instancia se cae, el balanceador simplemente deja de enviarle tráfico, garantizando que el usuario final no experimente caídas en el servicio.

## 3. Acceso, Configuración y Despliegue del Servidor Web

### Elastic IP vs IP Dinámica
Por defecto, las IPs públicas asignadas a las EC2 son efímeras (cambian si detienes y vuelves a arrancar la instancia). Una Elastic IP resuelve esto: es una dirección IPv4 pública estática que reservas y asocias a tu instancia, asegurando que tus configuraciones DNS o accesos no se rompan tras un reinicio.

### Conexión Vía SSH y Comandos de Configuración
Al conectarte desde la terminal de tu PC (`ssh -i credenciales.pem ec2-user@<IP_ELASTICA>`), sigues un flujo lógico para aprovisionar el servidor:

1.  `sudo su`: Te eleva a superusuario (root), otorgándote permisos totales y sin restricciones para instalar paquetes y modificar servicios a nivel de sistema.
2.  `dnf update -y`: `dnf` es el gestor de paquetes moderno (reemplazo de `yum` en las nuevas versiones de Amazon Linux). Este comando sincroniza repositorios e instala los últimos parches de seguridad del sistema operativo. La bandera `-y` acepta todas las confirmaciones automáticamente para no pausar el proceso.
3.  `dnf install httpd`: Descarga e instala Apache HTTP Server, el demonio que servirá tu aplicación o página estática.
4.  `systemctl start httpd`: Arranca el proceso de Apache inmediatamente en la sesión actual.
5.  `systemctl enable httpd`: **Comando crítico de resiliencia.** Configura Apache para que arranque de forma automática cada vez que el servidor se reinicie o se encienda.
6.  `systemctl status httpd`: Te permite realizar una comprobación visual. Confirma que el servicio está activo (verde/running) y operando sin conflictos.

### Despliegue del Contenido
*   `cd /var/www/html/`: Navegas al *Document Root* de Apache. Es el directorio por defecto expuesto al público. Todo lo que esté aquí dentro será servido por el puerto 80.
*   `nano index.html`: Creación manual y edición en terminal. Como bien notas, es un paso ambiguo y más orientado al aprendizaje inicial. En un entorno de desarrollo real, este paso manual se sustituye; aquí es donde clonarías tu repositorio (`git clone`), transferirías archivos construidos mediante `scp`, o donde un pipeline de CI/CD inyectaría directamente los artefactos (`build` de tu NextJS) de forma automatizada.

---

## 4. Prompt para generar la UI en tu aplicación Next.js

Para integrar toda esta información a tu app centralizada, puedes usar el siguiente prompt detallado en tu asistente de código (Cursor, Claude, Copilot, etc.):

**[COPIAR DESDE AQUÍ]**
> Actúa como un desarrollador experto en React, Next.js (App Router) y Tailwind CSS. Estoy construyendo una plataforma educativa interactiva donde centralizo el material de mi curso de AWS Cloud Architecture.
> 
> Quiero que construyas un componente de página llamado `AWSArchitectureGuide.tsx`. Este componente debe renderizar el contenido de una guía de arquitectura (VPC, EC2, Balanceadores) que te proporcionaré, pero no como simple texto, sino con un diseño UI/UX premium, limpio y muy interactivo.
> 
> **Requerimientos técnicos y de diseño:**
> 1.  **Layout y Navegación:** Implementa un layout que incluya un 'Table of Contents' (ToC) dinámico y fijado en el lado izquierdo o derecho (sticky sidebar), que resalte en qué sección de la guía se encuentra el usuario al hacer scroll.
> 2.  **Modo Oscuro/Tematización:** Usa una paleta de colores moderna orientada a herramientas de desarrollo (fondos oscuros tipo Vercel/AWS dark mode). Usa acentos de color naranja (tipo AWS `#FF9900`) para resaltar títulos, iconos o botones importantes.
> 3.  **Bloques de Código (Terminal):** Todos los comandos bash (`sudo su`, `dnf update -y`, etc.) deben estar dentro de componentes personalizados de 'CodeSnippet'. Estos componentes deben tener un diseño tipo terminal de Mac/Linux, mostrar el lenguaje, y tener un botón funcional de 'Copiar al portapapeles' con feedback visual (ej. cambiar a un ícono de check verde al hacer clic).
> 4.  **Profundización de Conceptos (Callouts/Accordions):** Las secciones marcadas como "Profundización" (Security Groups, Target Groups, Balanceadores de Carga) deben renderizarse usando un diseño especial. Usa tarjetas con bordes resaltados (Callouts) o componentes tipo 'Accordion' (colapsables) para organizar la información y que visualmente destaquen como conceptos clave de arquitectura.
> 5.  **Estructura del contenido:** Pasa el texto del markdown que te daré a continuación a una estructura de datos estructurada (JSON o constantes de React) para que el renderizado de la UI sea limpio y escalable mediante mapeo de componentes.
> 
> Aquí está el contenido base de la guía que debes utilizar para poblar la UI:
> [PEGAR AQUÍ EL CONTENIDO DE LA GUÍA]
**[FIN DEL PROMPT]**
