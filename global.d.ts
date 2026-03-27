declare module "*.svg" {
  const src: string
  export default src
}

declare module "*.png" {
  const src: string
  export default src
}

declare module "*.module.scss" {
  const classes: Record<string, string>
  export default classes
}

declare module "data-text:*" {
  const content: string
  export default content
}


declare module "*.scss"
