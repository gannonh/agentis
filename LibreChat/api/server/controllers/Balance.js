import Balance from '#models/Balance.js';

async function balanceController(req, res) {
  const { tokenCredits: balance = '' } =
    (await Balance.findOne({ user: req.user.id }, 'tokenCredits').lean()) ?? {};
  res.status(200).send('' + balance);
}

export default balanceController;
