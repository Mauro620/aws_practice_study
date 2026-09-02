# Guía Detallada: Arquitectura AWS, EC2 y Despliegue Estático

Esta guía centraliza los conceptos fundamentales de arquitectura en AWS, detallando no solo el *qué*, sino el *cómo* y *por qué* de cada configuración. Esta base sólida facilitará la transición futura hacia el empaquetado de aplicaciones con contenedores Docker y la automatización de entregas mediante pipelines CI/CD.

## 01. Red fundacional: Diseñar la VPC y sus subredes
Una VPC es el perímetro lógico de tu arquitectura: define dónde viven los recursos y cómo se conectan.

*   **Cómo hacerlo en consola:** Ve a *VPC Dashboard > Create VPC*. Selecciona "VPC and more" para crear visualmente las subredes y tablas de enrutamiento al mismo tiempo. Parte de un CIDR amplio, por ejemplo `10.0.0.0/16`. Distribuye subredes públicas y privadas en al menos dos Zonas de Disponibilidad (AZs). Asocia una tabla de rutas pública al Internet Gateway. Las subredes privadas salen por NAT Gateway solo cuando lo necesitan.
*   **Por qué importa:** Separar la entrada pública de los servicios internos reduce la superficie de ataque y deja una topología preparada para alta disponibilidad.
*   **Casos de uso:** ALB y NAT Gateway en subredes públicas. EC2 de aplicación, bases de datos y servicios internos en subredes privadas. Dos AZ para tolerar la pérdida de una zona completa.
*   **Consideraciones:**
    *   Una subred pública no es “pública” por su nombre: necesita ruta al IGW y recursos con IP pública.
    *   Planifica el CIDR antes de crear recursos; ampliarlo después puede ser costoso.
    *   Un NAT Gateway por AZ mejora la resiliencia, pero incrementa el costo.
    *   **Patrón recomendado:** dos AZ, una subred pública y una privada por AZ. La redundancia no elimina fallas, pero evita que una sola AZ sea un punto único de caída.

## 02. Computación: Levantar EC2 y administrar llaves
EC2 proporciona servidores virtuales configurables. La elección de imagen, tipo de instancia y credenciales define el punto de partida.

*   **Cómo hacerlo en consola:** Ve a *EC2 > Launch instances*. Usa *Amazon Linux 2023* cuando quieras una imagen optimizada para AWS y el gestor `dnf`. Elige el tipo de instancia según CPU, memoria, red y patrón de carga, no solo por precio (ej. t2.micro o t3.micro para empezar). En *Key pair (login)*, crea o selecciona un key pair por región y guarda el archivo `.pem` en un lugar seguro fuera del repositorio de código.
*   **Por qué importa:** Una configuración explícita evita servidores sobredimensionados y mantiene el acceso administrativo separado del tráfico de la aplicación.
*   **Casos de uso:** Servidor web estático para una práctica inicial. Backend dentro de una subred privada detrás de un ALB. Instancias reemplazables creadas desde una AMI o un Launch Template.
*   **Consideraciones:**
    *   Una llave privada perdida no se puede descargar de nuevo desde AWS.
    *   Usa IAM, Systems Manager Session Manager o un bastion host antes de exponer SSH públicamente.
    *   Etiqueta las instancias (Tags) por ambiente, servicio y responsable.

## 03. Profundización: Controlar el tráfico con Security Groups
El Security Group es un firewall stateful asociado a la interfaz de red de la instancia.

*   **Cómo hacerlo en consola:** En la creación de la EC2 (o en *EC2 > Security Groups*), define reglas *inbound* mínimas. Permite HTTP en TCP/80 y HTTPS en TCP/443 para tráfico protegido. Restringe SSH/TCP/22 estrictamente a tu IP pública o VPN.
*   **La regla 0.0.0.0/0 (Cuándo usarla y cuándo romper el estándar):** 
    *   *Por qué y cuándo usarla:* `0.0.0.0/0` significa "Cualquier IP de internet". **Solo** debe usarse para puertos web (80 y 443) en recursos públicos como tu Balanceador de Carga (ALB) o un servidor web frontend que deba ser visible globalmente.
    *   *Cuándo salirse del estándar:* Rara vez deberías abrir otros puertos a 0.0.0.0/0. Las excepciones temporales ocurren si necesitas integrar un webhook de un proveedor externo que no publica sus rangos de IPs, o si estás diagnosticando un bloqueo severo de red y necesitas descartar el firewall por 5 minutos. Sin embargo, dejar puertos de bases de datos o SSH abiertos globalmente garantiza escaneos y ataques automatizados en cuestión de minutos.
*   **Por qué importa:** La denegación por defecto y las referencias entre grupos hacen que la intención de acceso sea visible y auditable.
*   **Casos de uso:** SG del ALB recibe 80/443 desde internet. SG de aplicación recibe tráfico *únicamente* desde el SG del ALB. SG de base de datos recibe 3306, 5432 o 27017 *solo* desde el SG de aplicación.
*   **Consideraciones:**
    *   Es stateful: si permites una conexión de entrada, el tráfico de respuesta queda permitido automáticamente.
    *   Las reglas se suman; asociar varios grupos a una instancia puede abrir más acceso del esperado.
*   **La decisión que suele romper la arquitectura:** Piensa el flujo por capas: el navegador llega al ALB, el ALB llega a la aplicación, la aplicación llega a la BD. Cada salto tiene un origen confiable distinto. Abrir un puerto interno a todo internet elimina esa frontera.

## 04. Almacenamiento: Persistir datos con EBS y snapshots
EBS es el disco de red de una EC2. Los snapshots capturan un punto de recuperación almacenado por AWS.

*   **Cómo hacerlo en consola:** Al lanzar la instancia, en *Configure storage*, decide si el volumen Root debe eliminarse con la instancia ("Delete on termination"). Para bases de datos, añade un *New Volume* separado. Ve a *EC2 > Snapshots* para programar respaldos.
*   **Por qué importa:** La instancia puede ser reemplazable sin que el dato lo sea. Los snapshots permiten recuperar, clonar o crear AMIs.
*   **Consideraciones:** Un snapshot es una copia incremental. Cifra volúmenes y snapshots con KMS cuando el dato lo requiera.

## 05. Profundización: Distribuir tráfico con ALB y Target Groups
El ALB es la entrada estable; el Target Group conoce qué instancias están listas.

*   **Cómo hacerlo en consola:** 
    1. Ve a *EC2 > Target Groups*. Crea uno tipo "Instances", define puerto (ej. 80) y la ruta del *Health Check* (ej. `/`). Registra las EC2 deseadas.
    2. Ve a *EC2 > Load Balancers > Create*. Selecciona Application Load Balancer. Ubícalo en las subredes públicas. En "Listeners and routing", reenvía el tráfico del puerto 80 hacia el Target Group recién creado.
*   **Por qué importa:** El usuario conoce un DNS estable y el balanceador retira automáticamente destinos *unhealthy*.
*   **La decisión que suele romper la arquitectura:** Un Target Group no es solo una lista. Su health check define la condición mínima para enviar tráfico. Si apunta a un endpoint que responde 200 solo cuando la base de datos está disponible, una desconexión de BD hará que el balanceador marque la EC2 como insana y corte todo el tráfico de usuarios.

## 06. Operación segura: Resolver acceso con Elastic IP y SSH
Una IP pública dinámica cambia al detener la máquina. Elastic IP aporta una dirección estática.

*   **Cómo hacerlo en consola:** *EC2 > Elastic IPs > Allocate*. Luego selecciónala, *Actions > Associate Elastic IP address*, y vincúlala a tu EC2.
*   **Por qué importa:** Scripts y accesos manuales no se rompen al reiniciar la instancia. Tras una práctica, **libera** la IP si no está asociada para evitar cargos.

## 07. Entrega: Configurar el servidor y desplegar
Separar instalación, arranque y despliegue hace visible qué parte falló.

*   **Consideraciones:** `nano index.html` es útil para aprender, pero no es reproducible. No guardes secretos en el Document Root (`/var/www/html/`).

### Runbook de laboratorio: Comandos en orden
*Cada bloque se puede copiar de forma independiente.*

**Acceso inicial:**
```bash
ssh -i credenciales.pem ec2-user@<IP_ELASTICA>
```

**Preparar Amazon Linux:**
```bash
sudo su
dnf update -y
dnf install httpd
```

**Dejar Apache disponible (y persistente ante reinicios):**
```bash
systemctl start httpd
systemctl enable httpd
systemctl status httpd
```

**Publicar el contenido:**
```bash
cd /var/www/html/
nano index.html
```

---

## Prompt de UI para Next.js

> Actúa como un desarrollador experto en React, Next.js (App Router) y Tailwind CSS. Estoy construyendo una plataforma educativa interactiva donde centralizo el material de mi curso de AWS Cloud Architecture.
> 
> Construye un componente `AWSGuide.tsx` que renderice la guía estructurada en 7 pasos que te proporcionaré. 
> 
> **Requerimientos de UI/UX:**
> 1. **Sidebar Navegable (ToC):** Una barra lateral pegajosa (sticky) con los enlaces del 01 al 07 que haga scroll suave (smooth scroll) a las secciones.
> 2. **Tarjetas de Contexto:** Las secciones de "Por qué importa", "Casos de uso" y "Consideraciones" no deben ser texto plano. Renderízalas dentro de componentes visuales tipo tarjetas con iconos representativos de Lucide React (ej. escudo para seguridad, base de datos para EBS).
> 3. **Callouts de "Profundización":** Las alertas sobre "La decisión que suele romper la arquitectura" y "La regla 0.0.0.0/0" deben estar destacadas con un fondo rojo/naranja suave, borde lateral de advertencia y tipografía en negrita, advirtiendo al usuario de los antipatrones.
> 4. **Runbook Interactivo:** El bloque final de comandos debe ser un componente `TerminalWindow` con estilo oscuro. Cada bloque (Acceso, Preparar, etc.) debe tener un botón de "Copy" que pase a un check verde al hacer clic.
> 5. **JSON/Estructura de Datos:** Extrae el contenido markdown a un objeto o array tipado (TypeScript) para iterarlo limpiamente en la interfaz.
> 
> Aquí está el contenido a maquetar:
> [PEGAR CONTENIDO DESDE "01. Red fundacional" HASTA EL FINAL]
