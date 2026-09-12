// `server-only` lanza al importarse fuera de un React Server Component. En los
// tests ejecutamos esos modulos en Node a proposito, asi que se sustituye por
// un modulo vacio. La proteccion sigue activa en el build de la aplicacion.
export {};
