const loginForm = document.getElementById('loginPageForm');
const registerForm = document.getElementById('registerPageForm');
const formTitle = document.getElementById('formTitle');
const formDescription = document.getElementById('formDescription');
const formMessage = document.getElementById('formMessage');
const switchPrompt = document.getElementById('switchPrompt');
const switchForm = document.getElementById('switchForm');
let showingLogin = true;

async function request(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Não foi possível concluir a solicitação.');
  }

  return data;
}

function showMessage(message, success = false) {
  formMessage.textContent = message;
  formMessage.classList.toggle('success', success);
}

function setFormMode(showLogin) {
  showingLogin = showLogin;
  loginForm.hidden = !showLogin;
  registerForm.hidden = showLogin;
  formTitle.textContent = showLogin ? 'Que bom ter você de volta!' : 'Crie sua conta MathPlay';
  formDescription.textContent = showLogin
    ? 'Entre com seus dados para acessar sua conta.'
    : 'Cadastre-se para salvar seu progresso e começar a jogar.';
  switchPrompt.textContent = showLogin ? 'Ainda não tem uma conta?' : 'Já tem uma conta?';
  switchForm.textContent = showLogin ? 'Cadastre-se' : 'Fazer login';
  showMessage('');
}

async function redirectIfAuthenticated() {
  try {
    const response = await fetch('/api/session');
    if (!response.ok) {
      throw new Error('Não foi possível verificar sua sessão.');
    }
    const data = await response.json();
    if (data.user) {
      window.location.replace('/');
    }
  } catch (error) {
    showMessage(error.message);
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const submitButton = loginForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  showMessage('Verificando seus dados...');

  try {
    await request('/api/login', {
      email: formData.get('email').trim(),
      password: formData.get('password')
    });
    window.location.replace('/');
  } catch (error) {
    showMessage(error.message);
  } finally {
    submitButton.disabled = false;
  }
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(registerForm);
  const submitButton = registerForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  showMessage('Criando sua conta...');

  try {
    await request('/api/register', {
      username: formData.get('username').trim(),
      email: formData.get('email').trim(),
      password: formData.get('password'),
      role: 'Aluno'
    });
    window.location.replace('/');
  } catch (error) {
    showMessage(error.message);
  } finally {
    submitButton.disabled = false;
  }
});

switchForm.addEventListener('click', () => setFormMode(!showingLogin));
setFormMode(true);
redirectIfAuthenticated();
