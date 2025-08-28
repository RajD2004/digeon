// kept at the same place as original (top of <body>)
if (!localStorage.getItem('marketplaceUser')) {
  window.location.href = "login";
}
