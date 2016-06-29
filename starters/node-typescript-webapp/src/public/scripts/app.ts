class App {
  constructor(private element: HTMLElement) {

  }

  public start() {
    setInterval(() => {
      this.element.innerHTML = Date()
    }, 1000)
  }
}