export const helpEnglish: Record<string, { topic: string; intro?: string; steps: { title: string; text: string }[]; tip?: string }[]> = {
  students: [
    { topic: 'Registration and sign-in', steps: [
      { title: 'Create your account', text: 'Select Sign up and enter your name, username and student profile.' },
      { title: 'Choose how to sign in', text: 'Use your email and a password with at least eight characters and one digit, or Continue with Google.' },
      { title: 'Verify your email', text: 'Open the confirmation email and follow its link. Google sign-in verifies your account through Google.' },
      { title: 'Sign in again', text: 'Use the same email or Google account. Forgotten password sends a reset link to your email.' },
    ] },
    { topic: 'Subscription payment', steps: [
      { title: 'View plans', text: 'Open View offers from Papers or Lessons. Compare the benefits and available daily, weekly, monthly, trimester and annual prices.' },
      { title: 'Choose a plan and period', text: 'Select an available period. Check the exact price before paying.' },
      { title: 'Add a referral code if you have one', text: 'Enter your referrer’s username or school code before choosing the plan.' },
      { title: 'Pay with Mobile Money', text: 'Use a Cameroon Orange Money or MTN number. Enter your Mobile Money PIN only in your operator’s confirmation prompt, never on Yimaprof.' },
      { title: 'Wait for confirmation', text: 'Access opens after payment is confirmed. If the result is uncertain, check the payment instead of paying again.' },
    ] },
    { topic: 'Papers and lessons', steps: [
      { title: 'Choose your section', text: 'Select Anglophone or Francophone, then filter papers or lessons by class, subject and series.' },
      { title: 'Find the right paper', text: 'Filter by year and period, including the six school sequences. Free papers are labelled Free; paid content requires an active subscription.' },
      { title: 'Study and practise', text: 'Open a paper to read it. Graded self-evaluation requires an active subscription.' },
      { title: 'Read a lesson', text: 'Choose a lesson by subject and chapter. Its assigned classes and series are shown.' },
      { title: 'Complete exercises', text: 'The first Easy exercise is free; other exercises require a subscription. Complete an evaluation to unlock its correction and feedback.' },
    ] },
    { topic: 'Challenges', steps: [
      { title: 'Find a challenge', text: 'Open Challenges. Available challenges depend on their school scope and target classes or series. Participation requires an active subscription.' },
      { title: 'Start when ready', text: 'Read the warning before starting. There is one attempt, a running timer and no pause.' },
      { title: 'Use fullscreen', text: 'Fullscreen helps you focus if your browser supports it. Exits are counted only on the current page, not saved with your results, and do not reduce your score. The timer keeps running.' },
      { title: 'View results', text: 'Your score appears after submission. View results becomes available only after the challenge’s end date to show the top participants.' },
    ] },
  ],
  parents: [
    { topic: 'Registration and sign-in', steps: [
      { title: 'Open Yimaprof', text: 'Visit yimaprof.com on your phone. Bookmark it for next time.' },
      { title: 'Create an account', text: 'Use an email address or Continue with Google. An email or Google account is currently needed; phone-only registration is not available.' },
      { title: 'Confirm your account', text: 'Follow the email verification link if requested. Keep your login details private.' },
      { title: 'Get help from the school', text: 'The school can help create or link an account. Never share your password or security codes.' },
    ] },
    { topic: 'Paying for a subscription', steps: [
      { title: 'Compare plans', text: 'Open View offers and choose an available period for your child’s needs.' },
      { title: 'Check the account and amount', text: 'Make sure you are using the account that should receive access. Confirm the plan and amount.' },
      { title: 'Use Orange Money or MTN', text: 'Enter your Cameroon mobile number, then confirm on your phone using the operator’s prompt.' },
      { title: 'Keep your PIN private', text: 'Never enter your Mobile Money PIN on Yimaprof or send it to another person.' },
      { title: 'Check confirmation', text: 'Access opens once payment succeeds. For an uncertain payment, check its status before attempting another payment.' },
    ] },
    { topic: 'Your child’s papers and lessons', steps: [
      { title: 'Choose papers', text: 'Select the section, class and subject. Free papers are labelled; other access depends on the subscription.' },
      { title: 'Study lessons', text: 'Lessons contain course material and exercises at Easy, Intermediate and Difficult levels.' },
      { title: 'Follow progress', text: 'Use Progress to see completed work and results. A linked parent account can view its linked child’s available progress.' },
    ] },
    { topic: 'Challenges', steps: [
      { title: 'Check availability', text: 'School challenges are available to eligible students linked to that school.' },
      { title: 'Prepare before starting', text: 'Choose a quiet place with a reliable connection. The timer cannot be paused.' },
      { title: 'View rankings after closure', text: 'View results is available after the challenge’s end date.' },
    ] },
  ],
  schools: [
    { topic: 'School registration and sign-in', steps: [
      { title: 'Register your school', text: 'Open Sign up and select the School tab. Enter your school information and contact email.' },
      { title: 'Confirm the account', text: 'Follow the email verification instructions. School approval is managed by Yimaprof administration.' },
      { title: 'Sign in', text: 'Use your email and password or your linked Google account, then open the school space.' },
    ] },
    { topic: 'Students and subscriptions', steps: [
      { title: 'Open your school space', text: 'Find linked students, classes, subscription information and referral earnings.' },
      { title: 'Link students', text: 'Create student accounts from your school space or ask Yimaprof administration to link an existing account.' },
      { title: 'Follow referral earnings', text: 'Qualifying payments from school referrals generate earnings shown in your school space.' },
    ], tip: 'School names are anonymized as codes in student-facing screens.' },
    { topic: 'Withdraw school earnings', steps: [
      { title: 'Open Withdrawal', text: 'Read the withdrawal summary in your school space and select Continue.' },
      { title: 'Enter the amount and phone', text: 'Respect the displayed minimum and available balance. Choose Orange Money or MTN and the receiving number.' },
      { title: 'Verify your request', text: 'Enter the six-digit code sent by email. Google or Facebook sessions do not require a Yimaprof password; password sessions retain their password verification.' },
      { title: 'Track the payment', text: 'Administration reviews and initiates the transfer. Paid is shown only after provider confirmation. If pending, check the transfer rather than requesting a duplicate.' },
    ] },
    { topic: 'School challenges', steps: [
      { title: 'Create and target the challenge', text: 'Set the title, end date, duration, reward and eligible classes or series, then submit it for administration review.' },
      { title: 'Inform eligible students', text: 'Once approved and available, students can find the challenge in their Challenges menu.' },
      { title: 'Review results', text: 'After the end date, View results shows the best submitted scores.' },
    ] },
  ],
  affiliates: [
    { topic: 'Registration and sign-in', steps: [
      { title: 'Create your account', text: 'Sign up with your details or Continue with Google, then verify your email if requested.' },
      { title: 'Access the affiliate space', text: 'The affiliate tutorials and space are available to approved affiliate accounts.' },
    ] },
    { topic: 'Refer students', steps: [
      { title: 'Find your referral username', text: 'Your username is the referral code to share with students and parents.' },
      { title: 'Share it', text: 'Your referral enters the code on the offers page before selecting a subscription.' },
      { title: 'Follow earnings', text: 'Qualifying first payments generate affiliate commissions. Approved schools receive commissions on qualifying repeated referral payments.' },
    ] },
    { topic: 'Withdraw affiliate earnings', steps: [
      { title: 'Open your affiliate space', text: 'Review your available balance and select Withdrawal.' },
      { title: 'Choose the amount and number', text: 'Use the displayed minimum and available balance, then choose Orange Money or MTN.' },
      { title: 'Confirm securely', text: 'Use the email verification code and password if requested for a password session. Track the request until provider-confirmed payment.' },
    ] },
    { topic: 'Papers, lessons and challenges', steps: [
      { title: 'Show the platform', text: 'Show parents and students the paper library, structured lessons, exercises and challenges. Explain the difference between free content and subscription access.' },
    ] },
  ],
};