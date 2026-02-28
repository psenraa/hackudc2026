Autores: raojea, psenraa, yoelcanarion, peterrocherr

MousePass es una aplicacion web de arquitectura Zero-Knowledge para la generacion, verificacion y almacenamiento de contraseñas. Funciona estrictamente en el lado del cliente, asegurando que las credenciales nunca abandonen el equipo local.

Funcionalidades
Generacion: Crea contraseñas criptograficamente seguras utilizando la entropia obtenida de los micromovimientos del raton del usuario.
Verificacion: Comprueba si una contraseña ha sido filtrada usando la API de Have I Been Pwned mediante k-anonimato (enviando solo 5 caracteres del hash SHA-1).
Boveda local (Vault): Almacena las credenciales cifradas en el navegador, delegando el control de acceso a la seguridad del hardware del dispositivo (ej. Windows Hello).

Seguridad
Toda la criptografia se ejecuta localmente mediante la Web Crypto API. El cifrado de la boveda emplea AES-GCM de 256 bits. La clave de descifrado se deriva internamente mediante PBKDF2 (600.000 iteraciones con SHA-256) y el acceso esta protegido por el estandar WebAuthn.

Instalacion y Uso
MousePass no requiere instalacion ni dependencias de servidor. Al ser una aplicacion web estatica, basta con acceder a su URL desde cualquier navegador moderno.

Tecnologias
Frontend: HTML5, CSS3, JavaScript.

APIs Web: Web Crypto API, Web Authentication API (WebAuthn), Canvas API, localStorage.
