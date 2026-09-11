/**
 * pages/register.js — Multi-step registration
 */
document.addEventListener('DOMContentLoaded', () => {
  const user = (() => { try { return JSON.parse(sessionStorage.getItem('user') || 'null'); } catch { return null; } })();
  if (user) {
    window.location.href = user.role === 'admin' ? '/admin/dashboard' : user.role === 'teacher' ? '/teacher/question-bank' : user.role === 'coordinator' ? '/coordinator/tests' : user.role === 'sme' ? '/sme/dashboard' : '/student/dashboard';
    return;
  }

  let step = 1;

  function showStep(n) {
    [1, 2, 3].forEach(i => {
      document.getElementById(`step-${i}`).classList.toggle('hidden', i !== n);
      const label = document.getElementById(`step${i}-label`);
      label.classList.toggle('text-primary-600', i === n);
      label.classList.toggle('text-gray-400', i !== n);
    });
    step = n;
  }

  // Step 1 → 2
  document.getElementById('next-1').addEventListener('click', () => {
    const name = document.getElementById('name').value.trim();
    const cls = document.getElementById('studentClass').value;
    const exam = document.getElementById('targetExam').value;
    if (!name || !cls || !exam) return toast.error('Please fill in all fields');
    try {
      const data = await API.post('/auth/register', {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
        role: 'student',
        studentClass: document.getElementById('studentClass').value,
        targetExam: document.getElementById('targetExam').value,
        mobile: document.getElementById('mobile').value.trim(),
      });
      sessionStorage.setItem('user', JSON.stringify(data.user));
      toast.success('Registration successful!');
      window.location.href = '/student/dashboard';
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Register';
    }
  });
});
