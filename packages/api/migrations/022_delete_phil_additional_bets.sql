-- Delete Phil's additional bets on Grupo 4 (placed during testing)
DELETE FROM bets WHERE id IN (
    '6f2ec09f-6694-452f-88d4-5533c2b8e4d4',
    'e575f45a-120e-4f87-aa00-7a4447b161b4'
);
