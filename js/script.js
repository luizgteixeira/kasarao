(function () {
  try {
    // Obtém o caminho atual da URL (ex: /sobre.html)
    const currentPath =
      window.location.pathname.pop() || "index.html" || "quem-somos.html";

    // Seleciona todos os links do menu
    const links = document.querySelectorAll("nav a");

    links.forEach((link) => {
      // Pega apenas o nome do arquivo do href
      const linkPath = link.getAttribute("href").pop();

      // Se o link for o da página atual, adiciona a classe 'active'
      if (linkPath === currentPath) {
        link.classList.add("active");
      }
    });
  } catch (error) {
    console.error("Erro ao marcar link ativo:", error);
  }
})();
