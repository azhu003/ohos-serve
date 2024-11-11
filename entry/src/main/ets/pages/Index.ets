import { Polka, Request, ServerResponse, polka } from 'serve'

const app: Polka<Request> = polka()

@Entry
@Component
struct Index {
  build() {
    Column() {
      Button("发送")
        .onClick(() => {

        })
        .width("100%")
        .fontSize(14)
        .flexGrow(0)
    }
    .width('100%')
  }

  aboutToAppear(): void {
    this.start()
  }

  start() {
    app
      // .use('*', this.middle)
      .post("/api/localsend/v2/register", (req: Request, res: ServerResponse) => {
        res.writeJson(req.body)
          .then(() => {
            // logger.info('register send ok')
          })
          .catch((e: Error) => {
            // logger.error(`register send failed: ${JSON.stringify(e)}`)
          })
      })
      .post("/api/localsend/v2/prepare-upload", (req: Request, res: ServerResponse) => {
        // logger.info(`body\n${JSON.stringify(req.body)}`)
        res.writeJson(req.body)
      })
      .post("/api/localsend/v2/upload", (req: Request, res: ServerResponse) => {
        // let keys: string[] = Array.from(req.files.keys());
        // if (keys.length > 0) {
        //   const firstKey = keys[0]
        //   const first = req.files.get(firstKey)
        //   if (first) {
        //     let bufLength = first.buffer.byteLength;
        //     const fileName = req.fileParams?.get(firstKey)?.[0] || util.generateRandomUUID()
        //     const fileBuffer = req.files.get(firstKey)?.buffer
        //     let writeLength = createFile(getContext(this).filesDir, fileName, fileBuffer);
        //     if (bufLength === writeLength) {
        //       res.end('upload success!')
        //       return
        //     }
        //   }
        // }
        res.end('upload failure!')
      }

      )
      .listen(53317, '0.0.0.0')
    // server.start({ hostname: '0.0.0.0', port: 53317 })
    // AppStorage.set("server", server)
  }

  middle(req: Request, res: ServerResponse, next: () => void) {
    // logger.info(`~> Received ${req.method} on ${req.url}`);
    next(); // move on
  }
}