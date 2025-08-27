import {defineConfig} from 'vite'
import {viteStaticCopy} from "vite-plugin-static-copy";

export default defineConfig({
  base: '/TheHedgehog/',
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@shoelace-style/shoelace/dist/assets',
          dest: 'shoelace' // will become /shoelace/assets in dist
        }
      ]
    })
  ]
})