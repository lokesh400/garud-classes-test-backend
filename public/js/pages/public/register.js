/**
 * pages/register.js — Multi-step registration with OTP
 */
document.addEventListener('DOMContentLoaded', () => {
  const user = (() => { try { return JSON.parse(sessionStorage.getItem('user') || 'null'); } catch { return null; } })();
  if (user) {
    window.location.href = user.role === 'admin' ? '/admin/dashboard' : user.role === 'teacher' ? '/teacher/question-bank' : user.role === 'coordinator' ? '/coordinator/tests' : user.role === 'sme' ? '/sme/dashboard' : '/student/dashboard';
    return;
  }

  let step = 1;

  function showStep(n) {
    [1, 2, 3, 4].forEach(i => {
      const stepEl = document.getElementById(`step-${i}`);
      if (stepEl) {
        stepEl.classList.toggle('hidden', i !== n);
      }
      const label = document.getElementById(`step${i}-label`);
      if (label) {
        label.classList.toggle('text-garud-highlight', i === n);
        label.classList.toggle('text-white/40', i !== n);
      }
    });
    step = n;
  }

  // Step 1 → 2
  document.getElementById('next-1').addEventListener('click', () => {
    const name  = document.getElementById('name').value.trim();
    const cls   = document.getElementById('studentClass').value;
    const exam  = document.getElementById('targetExam').value;
    if (!name || !cls || !exam) return toast.error('Please fill in all fields');
    showStep(2);
  });

  // Step 2 back
  document.getElementById('prev-2').addEventListener('click', () => showStep(1));

  // Step 2 → 3
  document.getElementById('next-2').addEventListener('click', () => {
    const mobile   = document.getElementById('mobile').value.trim();
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (!mobile || !email || !password) return toast.error('Please fill in all fields');
    if (password.length < 8) return toast.error('Password must be at least 8 characters');

    // Populate review
    const name = document.getElementById('name').value.trim();
    const cls  = document.getElementById('studentClass').value;
    const exam = document.getElementById('targetExam').value;
    
    document.getElementById('review-name').textContent = name;
    document.getElementById('review-class').textContent = cls;
    document.getElementById('review-target').textContent = exam;
    document.getElementById('review-mobile').textContent = mobile;
    document.getElementById('review-email').textContent = email;
    
    showStep(3);
  });

  // Step 3 back
  document.getElementById('prev-3').addEventListener('click', () => showStep(2));

  // Step 3 -> 4 (Send OTP)
  document.getElementById('send-otp-btn').addEventListener('click', async () => {
    const btn = document.getElementById('send-otp-btn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Sending...';

    const email = document.getElementById('email').value.trim();
    try {
      const res = await API.post('/auth/register/send-otp', { email });
      toast.success(res.message || 'OTP sent to your email');
      showStep(4);
    } catch (err) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  });

  // Step 4 back
  document.getElementById('prev-4').addEventListener('click', () => showStep(3));

  // Final submit (Step 4 -> Register)
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const otp = document.getElementById('otp').value.trim();
    if (!otp) return toast.error('Please enter the OTP');

    const submitBtn = document.getElementById('submit-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Verifying...';

    try {
      const data = await API.post('/auth/register', {
        name:         document.getElementById('name').value.trim(),
        email:        document.getElementById('email').value.trim(),
        password:     document.getElementById('password').value,
        role:         'student',
        studentClass: document.getElementById('studentClass').value,
        targetExam:   document.getElementById('targetExam').value,
        mobile:       document.getElementById('mobile').value.trim(),
        otp:          otp,
      });
      sessionStorage.setItem('user', JSON.stringify(data.user));
      toast.success('Registration successful!');
      window.location.href = '/student/dashboard';
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
});
