let typedText = "";

const display = document.getElementById("typedText");

document.querySelectorAll("#keyboard button").forEach(button => {

  button.addEventListener("click", () => {

    const value = button.innerText;

    if (value === "SPACE") {
      typedText += " ";
    }

    else if (value === "⌫") {
      typedText = typedText.slice(0, -1);
    }

    else {
      typedText += value.toLowerCase();
    }

    display.innerText = typedText;

  });

});