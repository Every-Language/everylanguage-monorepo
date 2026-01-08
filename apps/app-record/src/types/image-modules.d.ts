type ImageModule = number | { uri: string };

declare module '*.png' {
  const value: ImageModule;
  export default value;
}

declare module '*.jpg' {
  const value: ImageModule;
  export default value;
}

declare module '*.jpeg' {
  const value: ImageModule;
  export default value;
}

declare module '*.webp' {
  const value: ImageModule;
  export default value;
}
